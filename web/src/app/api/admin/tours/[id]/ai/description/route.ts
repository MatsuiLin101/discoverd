import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAiKeys, getUserAiKeys, getEffectiveAiSettings, getSiteAiSetting } from "@/lib/ai/config";
import { buildDescriptionPrompt, DEFAULT_DESCRIPTION_MODEL } from "@/lib/ai/prompts";
import { GeminiHttpError } from "@/lib/ai/gemini";
import { generateDescriptionWithFallback } from "@/lib/ai/fallback";
import { logAiUsage } from "@/lib/ai/usage";
import { computeUsageCost } from "@/lib/ai/cost";
import { loadTourAiContext, parseContextOverride, MAX_CANDIDATES_PER_KIND } from "@/lib/ai/tour-context";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id } = await params;

    const count = await db.aiGeneration.count({ where: { tourId: id, kind: "DESCRIPTION" } });
    if (count >= MAX_CANDIDATES_PER_KIND) {
      return NextResponse.json(
        { error: `簡介候選已達上限 ${MAX_CANDIDATES_PER_KIND} 筆，請先刪除舊版本再生成` },
        { status: 409 },
      );
    }

    const [shared, personal] = await Promise.all([getAiKeys(), getUserAiKeys(session.userId)]);
    if (!shared.gemini && !personal.gemini) {
      return NextResponse.json({ error: "尚未設定 Gemini API 金鑰，請先於「AI 設定」或「AI 偏好」填寫" }, { status: 400 });
    }

    const effective = await getEffectiveAiSettings(session.userId);
    const descriptionPrompt = effective.descriptionPrompt;

    const body = await req.json().catch(() => ({}));
    const hint = typeof body?.hint === "string" && body.hint.trim() ? body.hint.trim() : null;
    const promptOverride =
      typeof body?.promptOverride === "string" && body.promptOverride.trim() ? body.promptOverride : null;
    // The on-screen field is pre-filled with the effective (personal ?? system)
    // model and sent verbatim. Clearing it means "don't use my preference" — fall
    // back to the SYSTEM model, not the personal one, so a bad personal model
    // (e.g. "Toy") can be escaped by emptying the field.
    const site = await getSiteAiSetting();
    const descriptionModel =
      typeof body?.model === "string" && body.model.trim()
        ? body.model.trim()
        : site.aiDescriptionModel || DEFAULT_DESCRIPTION_MODEL;
    // Quota choice: "shared" forces the shared key; otherwise personal-first.
    const forceShared = body?.quota === "shared";
    const personalGemini = forceShared ? null : personal.gemini;
    if (forceShared && !shared.gemini) {
      return NextResponse.json({ error: "已選擇公用額度，但尚未設定公用 Gemini 金鑰" }, { status: 400 });
    }

    // Use the editor's current (possibly unsaved) form values when provided.
    const ctx = await loadTourAiContext(id, parseContextOverride(body?.context));
    if (!ctx) return NextResponse.json({ error: "找不到此旅遊方案" }, { status: 404 });

    // A previewed/edited prompt is used verbatim; otherwise assemble it now.
    const prompt = promptOverride ?? buildDescriptionPrompt(descriptionPrompt, ctx.contextText, hint);

    // Base usage record shared by the success and failure paths.
    const usageBase = {
      userId: session.userId,
      userAccount: session.username,
      tourId: id,
      tourName: ctx.tour.name,
      kind: "DESCRIPTION" as const,
      provider: "gemini" as const,
      model: descriptionModel,
      hint,
      promptOverridden: !!promptOverride,
      promptText: prompt,
      pdfCount: ctx.pdfs.length,
    };

    const startedAt = Date.now();
    let result, keyOwner;
    try {
      ({ result, keyOwner } = await generateDescriptionWithFallback({
        personalKey: personalGemini,
        sharedKey: shared.gemini,
        model: descriptionModel,
        prompt,
        pdfs: ctx.pdfs,
      }));
    } catch (genErr) {
      void logAiUsage({
        ...usageBase,
        status: "FAILED",
        keyOwner: personalGemini ? "personal" : "shared",
        latencyMs: Date.now() - startedAt,
        error: genErr instanceof Error ? genErr.message : String(genErr),
      });
      throw genErr;
    }

    // Keep within the description column limit (500) used across the app.
    const trimmed = result.text.length > 500 ? result.text.slice(0, 500) : result.text;

    const candidate = await db.aiGeneration.create({
      data: {
        tourId: id,
        kind: "DESCRIPTION",
        status: "READY",
        text: trimmed,
        model: descriptionModel,
        prompt: hint ?? undefined,
        keyOwner,
        createdById: session.userId,
      },
    });

    const cost = await computeUsageCost({
      provider: "gemini",
      model: descriptionModel,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      thoughtsTokens: result.usage.thoughtsTokens,
    });
    void logAiUsage({
      ...usageBase,
      status: "SUCCESS",
      keyOwner,
      latencyMs: Date.now() - startedAt,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      thoughtsTokens: result.usage.thoughtsTokens,
      totalTokens: result.usage.totalTokens,
      resultRef: candidate.id,
      outputChars: trimmed.length,
      costUsd: cost.costUsd,
      costTwd: cost.costTwd,
    });

    return NextResponse.json({ data: candidate }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/tours/[id]/ai/description]", e);
    const quotaExhausted = e instanceof GeminiHttpError && e.status === 429;
    const message = quotaExhausted
      ? "Gemini 額度已用完（個人與公用皆無可用額度），請稍後再試或改用其他金鑰"
      : e instanceof Error
        ? e.message
        : "伺服器錯誤，請稍後再試";
    return NextResponse.json({ error: message }, { status: quotaExhausted ? 429 : 500 });
  }
}
