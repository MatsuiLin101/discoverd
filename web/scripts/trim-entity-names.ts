/**
 * One-off maintenance: find (and optionally fix) Region / SubRegion / Tag rows
 * whose `name` has leading or trailing whitespace. Such rows are invisible in
 * the admin UI yet break exact-name matching on import, which is how a second
 * "日本 " (trailing space) region gets spawned next to a clean "日本".
 *
 * Usage (from web/):
 *   tsx scripts/trim-entity-names.ts           # dry-run: list dirty rows only
 *   tsx scripts/trim-entity-names.ts --apply    # trim the safe (non-colliding) rows
 *
 * Region.name and Tag.name are @unique; SubRegion.name is unique per region in
 * practice. When the trimmed name would collide with an existing clean row, the
 * dirty row is reported as "需人工合併" and left untouched — merging its children
 * (sub-regions / tours) into the clean twin is a manual decision.
 */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { PrismaClient } from "../src/generated/prisma/client";

expand(config({ path: ".env.local" }));
const db = new PrismaClient();

const APPLY = process.argv.includes("--apply");

const isDirty = (name: string) => name !== name.trim();

async function main() {
  let dirtyTotal = 0;
  let fixed = 0;
  let needMerge = 0;

  // --- Region (name @unique, global scope) ---
  const regions = await db.region.findMany({ select: { id: true, name: true } });
  const regionNames = new Set(regions.map((r) => r.name));
  console.log("== Region ==");
  for (const r of regions.filter((r) => isDirty(r.name))) {
    dirtyTotal++;
    const target = r.name.trim();
    const collides = regionNames.has(target); // a clean twin already exists
    console.log(
      `  ${collides ? "需人工合併" : "可修正"}  "${r.name}" -> "${target}"  (id=${r.id})`,
    );
    if (collides) {
      needMerge++;
    } else if (APPLY) {
      await db.region.update({ where: { id: r.id }, data: { name: target } });
      regionNames.delete(r.name);
      regionNames.add(target);
      fixed++;
    }
  }

  // --- SubRegion (name unique within its region) ---
  const subs = await db.subRegion.findMany({ select: { id: true, name: true, regionId: true } });
  const subNamesByRegion = new Map<string, Set<string>>();
  for (const s of subs) {
    const set = subNamesByRegion.get(s.regionId) ?? new Set<string>();
    set.add(s.name);
    subNamesByRegion.set(s.regionId, set);
  }
  console.log("== SubRegion ==");
  for (const s of subs.filter((s) => isDirty(s.name))) {
    dirtyTotal++;
    const target = s.name.trim();
    const scope = subNamesByRegion.get(s.regionId)!;
    const collides = scope.has(target);
    console.log(
      `  ${collides ? "需人工合併" : "可修正"}  "${s.name}" -> "${target}"  (id=${s.id}, regionId=${s.regionId})`,
    );
    if (collides) {
      needMerge++;
    } else if (APPLY) {
      await db.subRegion.update({ where: { id: s.id }, data: { name: target } });
      scope.delete(s.name);
      scope.add(target);
      fixed++;
    }
  }

  // --- Tag (name @unique, global scope) ---
  const tags = await db.tag.findMany({ select: { id: true, name: true } });
  const tagNames = new Set(tags.map((t) => t.name));
  console.log("== Tag ==");
  for (const t of tags.filter((t) => isDirty(t.name))) {
    dirtyTotal++;
    const target = t.name.trim();
    const collides = tagNames.has(target);
    console.log(
      `  ${collides ? "需人工合併" : "可修正"}  "${t.name}" -> "${target}"  (id=${t.id})`,
    );
    if (collides) {
      needMerge++;
    } else if (APPLY) {
      await db.tag.update({ where: { id: t.id }, data: { name: target } });
      tagNames.delete(t.name);
      tagNames.add(target);
      fixed++;
    }
  }

  console.log("\n---");
  console.log(`發現頭尾帶空白的名稱：${dirtyTotal} 筆`);
  console.log(`需人工合併（trim 後會與既有乾淨資料衝突）：${needMerge} 筆`);
  if (APPLY) {
    console.log(`已自動修正：${fixed} 筆`);
  } else {
    console.log(`本次為 dry-run，未變更任何資料。加上 --apply 可自動修正可修正的 ${dirtyTotal - needMerge} 筆。`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
