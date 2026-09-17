import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEffectiveAiSettings } from "@/lib/ai/config";
import { buildDescriptionPrompt, buildThumbnailPrompt } from "@/lib/ai/prompts";
import { loadTourAiContext, parseContextOverride } from "@/lib/ai/tour-context";

/**
 * Assemble the exact prompt that generation would send, without calling any AI
 * (no cost). The client shows it for preview/editing before generating.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind === "THUMBNAIL" ? "THUMBNAIL" : "DESCRIPTION";
    const hint = typeof body?.hint === "string" && body.hint.trim() ? body.hint.trim() : null;
    // Attach uploaded PDFs unless the editor opted out (default: include).
    const includePdfs = body?.includePdfs !== false;

    const ctx = await loadTourAiContext(id, parseContextOverride(body?.context), { includePdfs });
    if (!ctx) return NextResponse.json({ error: "找不到此旅遊方案" }, { status: 404 });

    const settings = await getEffectiveAiSettings(session.userId);
    const prompt =
      kind === "THUMBNAIL"
        ? buildThumbnailPrompt(settings.thumbnailPrompt, ctx.contextText, hint)
        : buildDescriptionPrompt(settings.descriptionPrompt, ctx.contextText, hint);

    return NextResponse.json({ data: { prompt, pdfCount: kind === "DESCRIPTION" ? ctx.pdfs.length : 0 } });
  } catch (e) {
    console.error("[POST /api/admin/tours/[id]/ai/preview]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
