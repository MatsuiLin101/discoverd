/**
 * One-off backfill: assign frozen codes / productIds to pre-existing data.
 *
 *   Region.code    -> 101, 102, ...    (by sortOrder)
 *   SubRegion.code -> 01, 02, ...       (by sortOrder, within region)
 *   Tour.productId -> regionCode+subCode+YYMMDD+seq, YYMMDD from createdAt
 *                     (UTC+8), daily seq per (subRegion, day) by createdAt order
 *
 * Idempotent: rows that already have a code/productId are left untouched.
 * Run once after the add_product_id_and_import_log migration.
 */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  nextRegionCode,
  nextSubCode,
  allocateProductId,
} from "../src/lib/excel/product-id";

expand(config({ path: ".env.local" }));
const db = new PrismaClient();

async function main() {
  const result = await db.$transaction(async (tx) => {
    let regionsAssigned = 0;
    let subsAssigned = 0;
    let toursAssigned = 0;

    const regions = await tx.region.findMany({ orderBy: { sortOrder: "asc" } });
    for (const region of regions) {
      if (!region.code) {
        const code = await nextRegionCode(tx);
        await tx.region.update({ where: { id: region.id }, data: { code } });
        regionsAssigned++;
      }
      const subs = await tx.subRegion.findMany({
        where: { regionId: region.id },
        orderBy: { sortOrder: "asc" },
      });
      for (const sub of subs) {
        if (!sub.code) {
          const code = await nextSubCode(tx, region.id);
          await tx.subRegion.update({ where: { id: sub.id }, data: { code } });
          subsAssigned++;
        }
      }
    }

    // Tours in creation order so the daily sequence is deterministic.
    const tours = await tx.tour.findMany({
      where: { productId: null },
      orderBy: { createdAt: "asc" },
      include: { subRegion: true },
    });
    for (const tour of tours) {
      const sub = await tx.subRegion.findUnique({
        where: { id: tour.subRegionId },
        select: { code: true, region: { select: { code: true } } },
      });
      const regionCode = sub?.region.code;
      const subCode = sub?.code;
      if (!regionCode || !subCode) {
        throw new Error(`Tour ${tour.id} 的分類缺少代碼，無法配發 productId`);
      }
      const productId = await allocateProductId(tx, regionCode, subCode, tour.createdAt);
      await tx.tour.update({ where: { id: tour.id }, data: { productId } });
      toursAssigned++;
    }

    return { regionsAssigned, subsAssigned, toursAssigned };
  });

  console.log("回填完成：", result);

  // Show a small sample for eyeballing.
  const sample = await db.tour.findMany({
    take: 5,
    orderBy: { createdAt: "asc" },
    select: { name: true, productId: true, subRegion: { select: { name: true, code: true, region: { select: { name: true, code: true } } } } },
  });
  for (const t of sample) {
    console.log(
      `  ${t.subRegion.region.code}/${t.subRegion.code} ${t.subRegion.region.name}/${t.subRegion.name} · ${t.name} -> ${t.productId}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
