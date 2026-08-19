import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { xlsxDownload, exportDateStamp } from "@/lib/excel/xlsx";
import { buildTourExport, buildTourTemplate } from "@/lib/excel/tours";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const isTemplate = new URL(req.url).searchParams.get("template") === "1";
    const buf = isTemplate ? await buildTourTemplate() : await buildTourExport();
    const filename = isTemplate ? "旅遊方案匯入範本.xlsx" : `旅遊方案_${exportDateStamp()}.xlsx`;
    return xlsxDownload(buf, filename);
  } catch (e) {
    console.error("[GET /api/admin/tours/export]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
