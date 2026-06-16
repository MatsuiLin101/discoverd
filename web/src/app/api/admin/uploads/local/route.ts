import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { storage, isAllowedContentType } from "@/lib/storage";

/**
 * Receiver for the local storage driver: the upload client PUTs the raw file
 * body here (R2 driver uploads directly to R2 and never hits this route).
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const key = req.nextUrl.searchParams.get("key");
    if (!key || key.includes("..") || key.startsWith("/")) {
      return NextResponse.json({ error: "無效的 key" }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!isAllowedContentType(contentType)) {
      return NextResponse.json({ error: "不支援的檔案格式" }, { status: 400 });
    }

    const body = Buffer.from(await req.arrayBuffer());
    if (body.length === 0) {
      return NextResponse.json({ error: "空白檔案" }, { status: 400 });
    }

    await storage.put(key, body, contentType);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PUT /api/admin/uploads/local]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
