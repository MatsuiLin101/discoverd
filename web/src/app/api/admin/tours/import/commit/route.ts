import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeLog } from "@/lib/log";
import { loadPending, markCommitted } from "@/lib/excel/import-core";
import { commitTours, type TourImportPayload } from "@/lib/excel/tours";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "僅限管理員操作" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) return NextResponse.json({ error: "缺少匯入批次" }, { status: 400 });

    const res = await loadPending(token, "TOUR", session.userId);
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });

    const payload = res.log.payload as unknown as TourImportPayload;
    const applied = await commitTours(payload.rows);

    // Preview-level skips (duplicate ProductIDs) + any commit-time quota skips.
    const previewSkipped = (res.log.summary as { skippedCount?: number }).skippedCount ?? 0;
    const counts = {
      createdCount: applied.createdCount,
      updatedCount: applied.updatedCount,
      skippedCount: previewSkipped + applied.quotaSkipped.length,
    };
    await markCommitted(token, counts);

    void writeLog({
      userId: session.userId,
      userAccount: session.username,
      action: "CREATE",
      resource: "IMPORT",
      resourceId: token,
      resourceName: `旅遊方案匯入（${res.log.filename}）`,
      detail: {
        module: "TOUR",
        filename: res.log.filename,
        ...counts,
        quotaSkipped: applied.quotaSkipped,
      },
    });

    return NextResponse.json({
      data: {
        ...counts,
        quotaSkipped: applied.quotaSkipped,
      },
    });
  } catch (e) {
    console.error("[POST /api/admin/tours/import/commit]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
