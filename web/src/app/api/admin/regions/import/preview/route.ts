import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createPending, findPriorImport, md5Hex } from "@/lib/excel/import-core";
import { analyzeRegions, readRegionRows } from "@/lib/excel/regions";
import type { Prisma } from "@/generated/prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "僅限管理員操作" }, { status: 403 });
    }
    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "請選擇要匯入的 Excel 檔案" }, { status: 400 });
    }
    const buf = await file.arrayBuffer();
    const md5 = md5Hex(buf);

    let rows;
    try {
      rows = await readRegionRows(buf);
    } catch {
      return NextResponse.json({ error: "無法解析此 Excel 檔案" }, { status: 400 });
    }

    const { preview, payload } = await analyzeRegions(rows);
    const prior = await findPriorImport("REGION", md5);
    const priorImport = prior ? { filename: prior.filename, committedAt: prior.committedAt } : null;

    const token = await createPending({
      module: "REGION",
      filename: file.name,
      md5,
      payload: payload as unknown as Prisma.InputJsonValue,
      summary: { ...preview, priorImport } as unknown as Prisma.InputJsonValue,
      userId: session.userId,
    });

    return NextResponse.json({ data: { token, preview, priorImport } });
  } catch (e) {
    console.error("[POST /api/admin/regions/import/preview]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
