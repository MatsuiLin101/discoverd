import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeLog } from "@/lib/log";
import { loadPending, markCommitted } from "@/lib/excel/import-core";
import { commitTagImport, type TagImportPayload } from "@/lib/excel/tags";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "僅限管理員操作" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) return NextResponse.json({ error: "缺少匯入批次" }, { status: 400 });

    const res = await loadPending(token, "TAG", session.userId);
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });

    const payload = res.log.payload as unknown as TagImportPayload;
    // Apply the batch, then report the counts the user saw in the preview
    // (the token guarantees "what you previewed is what commits").
    await commitTagImport(payload);
    const summary = res.log.summary as {
      createdCount?: number;
      updatedCount?: number;
      skippedCount?: number;
    };
    const counts = {
      createdCount: summary.createdCount ?? 0,
      updatedCount: summary.updatedCount ?? 0,
      skippedCount: summary.skippedCount ?? 0,
    };
    await markCommitted(token, counts);

    void writeLog({
      userId: session.userId,
      userAccount: session.username,
      action: "CREATE",
      resource: "IMPORT",
      resourceId: token,
      resourceName: `標籤匯入（${res.log.filename}）`,
      detail: { module: "TAG", filename: res.log.filename, ...counts },
    });

    return NextResponse.json({ data: counts });
  } catch (e) {
    console.error("[POST /api/admin/tags/import/commit]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
