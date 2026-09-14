import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";
import { getAiKeys, getEffectiveAiSettings } from "@/lib/ai/config";
import { generateDescription } from "@/lib/ai/gemini";
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

    const keys = await getAiKeys();
    if (!keys.gemini) {
      return NextResponse.json({ error: "尚未設定 Gemini API 金鑰，請先於「AI 設定」填寫" }, { status: 400 });
    }

    const { descriptionModel, descriptionPrompt } = await getEffectiveAiSettings(session.userId);

    const body = await req.json().catch(() => ({}));
    const hint = typeof body?.hint === "string" && body.hint.trim() ? body.hint.trim() : null;

    // Use the editor's current (possibly unsaved) form values when provided.
    const ctx = await loadTourAiContext(id, parseContextOverride(body?.context));
    if (!ctx) return NextResponse.json({ error: "找不到此旅遊方案" }, { status: 404 });
    const contextText = hint ? `${ctx.contextText}\n重點提示：${hint}` : ctx.contextText;

    const text = await generateDescription({
      apiKey: keys.gemini,
      model: descriptionModel,
      systemPrompt: descriptionPrompt,
      contextText,
      pdfs: ctx.pdfs,
    });
    // Keep within the description column limit (500) used across the app.
    const trimmed = text.length > 500 ? text.slice(0, 500) : text;

    const candidate = await db.aiGeneration.create({
      data: {
        tourId: id,
        kind: "DESCRIPTION",
        status: "READY",
        text: trimmed,
        model: descriptionModel,
        prompt: hint ?? undefined,
        createdById: session.userId,
      },
    });

    void writeLog({
      userId: session.userId,
      userAccount: session.username,
      action: "CREATE",
      resource: "AI_GENERATION",
      resourceId: candidate.id,
      resourceName: `AI 簡介：${ctx.tour.name}`,
      detail: { tourId: id, kind: "DESCRIPTION", model: descriptionModel, usedPdf: ctx.pdfs.length },
    });

    return NextResponse.json({ data: candidate }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/tours/[id]/ai/description]", e);
    const message = e instanceof Error ? e.message : "伺服器錯誤，請稍後再試";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
