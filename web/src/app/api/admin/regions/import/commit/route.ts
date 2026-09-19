import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeLog } from "@/lib/log";
import { revalidatePublic } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { loadPending, markCommitted, rowKey } from "@/lib/excel/import-core";
import { commitRegions, type RegionImportPayload } from "@/lib/excel/regions";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "請先登入" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) return NextResponse.json({ error: "缺少匯入批次" }, { status: 400 });
    // Optional per-row selection (keys from the preview). Omitted = import all.
    const selected: string[] | null = Array.isArray(body.selected) ? body.selected : null;

    const res = await loadPending(token, "REGION", session.userId);
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });

    const payload = res.log.payload as unknown as RegionImportPayload;
    const rowsToApply = selected
      ? payload.rows.filter((r) => selected.includes(rowKey(undefined, r.row)))
      : payload.rows;
    await commitRegions(rowsToApply);

    // Re-derive counts from the stored preview rows, honouring the selection:
    // create/update rows that were applied are counted as such; skip rows and
    // deselected rows fold into skipped.
    const summary = res.log.summary as {
      rows?: { row: number; action: "create" | "update" | "skip" }[];
    };
    const applies = (row: number) => !selected || selected.includes(rowKey(undefined, row));
    const counts = { createdCount: 0, updatedCount: 0, skippedCount: 0 };
    for (const dr of summary.rows ?? []) {
      if (dr.action === "skip" || !applies(dr.row)) counts.skippedCount++;
      else if (dr.action === "create") counts.createdCount++;
      else counts.updatedCount++;
    }
    await markCommitted(token, counts);

    void writeLog({
      userId: session.userId,
      userAccount: session.username,
      action: "CREATE",
      resource: "IMPORT",
      resourceId: token,
      resourceName: `地區匯入（${res.log.filename}）`,
      detail: { module: "REGION", filename: res.log.filename, ...counts },
    });

    revalidatePublic(CACHE_TAGS.regions, CACHE_TAGS.tours);
    return NextResponse.json({ data: counts });
  } catch (e) {
    console.error("[POST /api/admin/regions/import/commit]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
