import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  storage,
  buildKey,
  isAllowedContentType,
  ALLOWED_UPLOAD_FOLDERS,
  ADMIN_ONLY_UPLOAD_FOLDERS,
} from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { folder, filename, contentType } = (await req.json()) as {
      folder?: string;
      filename?: string;
      contentType?: string;
    };

    if (!folder || !ALLOWED_UPLOAD_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "不支援的上傳分類" }, { status: 400 });
    }
    if (ADMIN_ONLY_UPLOAD_FOLDERS.has(folder) && session.role !== "ADMIN") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }
    if (!contentType || !isAllowedContentType(contentType)) {
      return NextResponse.json({ error: "不支援的檔案格式" }, { status: 400 });
    }

    const key = buildKey(folder, filename ?? "", contentType);
    const auth = await storage.createUploadAuth(key, contentType);
    return NextResponse.json({ data: auth });
  } catch (e) {
    console.error("[POST /api/admin/uploads/presign]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
