import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { xlsxDownload, exportDateStamp } from "@/lib/excel/xlsx";
import { buildTourExport, buildTourTemplate } from "@/lib/excel/tours";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const params = new URL(req.url).searchParams;
    const isTemplate = params.get("template") === "1";
    const regionsParam = params.get("regions");
    const regionIds = regionsParam
      ? regionsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const buf = isTemplate ? await buildTourTemplate() : await buildTourExport(regionIds);
    const filename = isTemplate
      ? "旅遊方案匯入範本.xlsx"
      : `旅遊方案${regionIds && regionIds.length ? "_部分" : ""}_${exportDateStamp()}.xlsx`;
    return xlsxDownload(buf, filename);
  } catch (e) {
    console.error("[GET /api/admin/tours/export]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
