import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";
import { getAiKeys, getEffectiveAiSettings } from "@/lib/ai/config";
import { createThumbnailTask } from "@/lib/ai/manus";
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

    const keys = await getAiKeys();
    if (!keys.manus) {
      return NextResponse.json({ error: "尚未設定 Manus API 金鑰，請先於「AI 設定」填寫" }, { status: 400 });
    }

    const { thumbnailPrompt } = await getEffectiveAiSettings(session.userId);

    const body = await req.json().catch(() => ({}));
    const hint = typeof body?.hint === "string" && body.hint.trim() ? body.hint.trim() : null;

    // Use the editor's current (possibly unsaved) form values when provided.
    const ctx = await loadTourAiContext(id, parseContextOverride(body?.context));
    if (!ctx) return NextResponse.json({ error: "找不到此旅遊方案" }, { status: 404 });

    const fullPrompt = `${thumbnailPrompt}\n${ctx.contextText}${hint ? `\n重點提示：${hint}` : ""}`;

    const taskId = await createThumbnailTask({ apiKey: keys.manus, prompt: fullPrompt });

    const candidate = await db.aiGeneration.create({
      data: {
        tourId: id,
        kind: "THUMBNAIL",
        status: "PENDING",
        taskId,
        model: "manus",
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
      resourceName: `AI 縮圖：${ctx.tour.name}`,
      detail: { tourId: id, kind: "THUMBNAIL", taskId },
    });

    return NextResponse.json({ data: candidate }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/tours/[id]/ai/thumbnail]", e);
    const message = e instanceof Error ? e.message : "伺服器錯誤，請稍後再試";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
