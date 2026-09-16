import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAiKeys, getUserAiKeys, getEffectiveAiSettings, getSiteAiSetting } from "@/lib/ai/config";
import { createThumbnailTask } from "@/lib/ai/manus";
import { buildThumbnailPrompt, toAgentProfile } from "@/lib/ai/prompts";
import { selectManusKey } from "@/lib/ai/fallback";
import { logAiUsage } from "@/lib/ai/usage";
import { loadTourAiContext, parseContextOverride, MAX_CANDIDATES_PER_KIND } from "@/lib/ai/tour-context";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id } = await params;

    // PENDING + READY thumbnails both count toward the cap (FAILED does not).
    const count = await db.aiGeneration.count({
      where: { tourId: id, kind: "THUMBNAIL", status: { in: ["PENDING", "READY"] } },
    });
    if (count >= MAX_CANDIDATES_PER_KIND) {
      return NextResponse.json(
        { error: `縮圖候選已達上限 ${MAX_CANDIDATES_PER_KIND} 筆，請先刪除舊版本再生成` },
        { status: 409 },
      );
    }

    const [shared, personal, site] = await Promise.all([
      getAiKeys(),
      getUserAiKeys(session.userId),
      getSiteAiSetting(),
    ]);
    if (!shared.manus && !personal.manus) {
      return NextResponse.json({ error: "尚未設定 Manus API 金鑰，請先於「AI 設定」或「AI 偏好」填寫" }, { status: 400 });
    }

    const reqBody = await req.json().catch(() => ({}));
    // Quota choice: "shared" forces the shared key; otherwise personal-first.
    const forceShared = reqBody?.quota === "shared";
    if (forceShared && !shared.manus) {
      return NextResponse.json({ error: "已選擇公用額度，但尚未設定公用 Manus 金鑰" }, { status: 400 });
    }
    // Prefer the personal key when its balance clears the threshold; else shared.
    const { key: manusKey, keyOwner } = await selectManusKey({
      personalKey: forceShared ? null : personal.manus,
      sharedKey: shared.manus,
      threshold: site.aiManusPersonalThreshold,
    });
    if (!manusKey) {
      return NextResponse.json({ error: "個人 Manus 金鑰無效且未設定公用金鑰" }, { status: 400 });
    }

    const { thumbnailPrompt, thumbnailAgentProfile } = await getEffectiveAiSettings(session.userId);

    const body = reqBody;
    const hint = typeof body?.hint === "string" && body.hint.trim() ? body.hint.trim() : null;
    const promptOverride =
      typeof body?.promptOverride === "string" && body.promptOverride.trim() ? body.promptOverride : null;
    // Per-generation override, else the effective (personal ?? system) profile.
    const agentProfile = toAgentProfile(body?.agentProfile) ?? thumbnailAgentProfile;

    // Use the editor's current (possibly unsaved) form values when provided.
    const ctx = await loadTourAiContext(id, parseContextOverride(body?.context));
    if (!ctx) return NextResponse.json({ error: "找不到此旅遊方案" }, { status: 404 });

    // A previewed/edited prompt is used verbatim; otherwise assemble it now.
    const fullPrompt = promptOverride ?? buildThumbnailPrompt(thumbnailPrompt, ctx.contextText, hint);

    const usageBase = {
      userId: session.userId,
      userAccount: session.username,
      tourId: id,
      tourName: ctx.tour.name,
      kind: "THUMBNAIL" as const,
      provider: "manus" as const,
      model: "manus",
      agentProfile,
      keyOwner,
      hint,
      promptOverridden: !!promptOverride,
      promptText: fullPrompt,
      pdfCount: ctx.pdfs.length,
    };

    let taskId: string;
    try {
      taskId = await createThumbnailTask({ apiKey: manusKey, prompt: fullPrompt, agentProfile, pdfs: ctx.pdfs });
    } catch (genErr) {
      void logAiUsage({
        ...usageBase,
        status: "FAILED",
        error: genErr instanceof Error ? genErr.message : String(genErr),
      });
      throw genErr;
    }

    const candidate = await db.aiGeneration.create({
      data: {
        tourId: id,
        kind: "THUMBNAIL",
        status: "PENDING",
        taskId,
        model: "manus",
        prompt: hint ?? undefined,
        keyOwner,
        createdById: session.userId,
      },
    });

    // PENDING usage row; the poll route updates it (by taskId) on completion.
    void logAiUsage({ ...usageBase, status: "PENDING", taskId });

    return NextResponse.json({ data: candidate }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/tours/[id]/ai/thumbnail]", e);
    const message = e instanceof Error ? e.message : "伺服器錯誤，請稍後再試";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
