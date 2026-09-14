import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage, buildKey, MIME_TO_EXT } from "@/lib/storage";
import { writeLog } from "@/lib/log";
import { getAiKeys } from "@/lib/ai/config";
import { getTaskResult } from "@/lib/ai/manus";
import { finishAiUsageByTaskId } from "@/lib/ai/usage";
import { serializeGeneration } from "@/lib/ai/serialize";

/**
 * GET advances and reports a candidate. For a PENDING thumbnail it polls Manus:
 * once the task is done it downloads the image, stores it, and flips the row to
 * READY; on failure it flips to FAILED. Description candidates are returned as-is.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id, genId } = await params;
    const gen = await db.aiGeneration.findUnique({ where: { id: genId } });
    if (!gen || gen.tourId !== id) {
      return NextResponse.json({ error: "找不到此生成紀錄" }, { status: 404 });
    }

    if (gen.kind !== "THUMBNAIL" || gen.status !== "PENDING" || !gen.taskId) {
      return NextResponse.json({ data: serializeGeneration(gen) });
    }

    const keys = await getAiKeys();
    if (!keys.manus) {
      return NextResponse.json({ data: serializeGeneration(gen) });
    }

    const result = await getTaskResult({ apiKey: keys.manus, taskId: gen.taskId });
    if (result.status === "pending") {
      return NextResponse.json({ data: serializeGeneration(gen) });
    }
    if (result.status === "error") {
      const updated = await db.aiGeneration.update({
        where: { id: genId },
        data: { status: "FAILED", error: result.message },
      });
      void finishAiUsageByTaskId(gen.taskId, { status: "FAILED", error: result.message });
      return NextResponse.json({ data: serializeGeneration(updated) });
    }

    // Done: download the produced image and store it under `tours/`.
    const res = await fetch(result.imageUrl);
    if (!res.ok) {
      const updated = await db.aiGeneration.update({
        where: { id: genId },
        data: { status: "FAILED", error: "下載 Manus 產生的圖片失敗" },
      });
      void finishAiUsageByTaskId(gen.taskId, { status: "FAILED", error: "下載 Manus 產生的圖片失敗" });
      return NextResponse.json({ data: serializeGeneration(updated) });
    }
    const contentType = res.headers.get("content-type") ?? "image/png";
    const normalizedType = contentType in MIME_TO_EXT ? contentType : "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    const key = buildKey("tours", "manus-thumbnail", normalizedType);
    await storage.put(key, buf, normalizedType);

    const updated = await db.aiGeneration.update({
      where: { id: genId },
      data: { status: "READY", imageKey: key, error: null },
    });
    void finishAiUsageByTaskId(gen.taskId, { status: "SUCCESS", resultRef: key });
    return NextResponse.json({ data: serializeGeneration(updated) });
  } catch (e) {
    console.error("[GET /api/admin/tours/[id]/ai/generations/[genId]]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id, genId } = await params;
    const gen = await db.aiGeneration.findUnique({ where: { id: genId } });
    if (!gen || gen.tourId !== id) {
      return NextResponse.json({ error: "找不到此生成紀錄" }, { status: 404 });
    }

    // Only delete the stored image if it isn't in use as the tour's thumbnail.
    if (gen.imageKey) {
      const tour = await db.tour.findUnique({ where: { id }, select: { thumbnailKey: true } });
      if (tour?.thumbnailKey !== gen.imageKey) {
        await storage.delete(gen.imageKey).catch(() => {});
      }
    }

    await db.aiGeneration.delete({ where: { id: genId } });

    void writeLog({
      userId: session.userId,
      userAccount: session.username,
      action: "DELETE",
      resource: "AI_GENERATION",
      resourceId: genId,
      resourceName: `AI ${gen.kind === "THUMBNAIL" ? "縮圖" : "簡介"}候選`,
      detail: { tourId: id, kind: gen.kind },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/tours/[id]/ai/generations/[genId]]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
