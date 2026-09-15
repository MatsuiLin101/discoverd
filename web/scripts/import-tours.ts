/**
 * Batch import tours from an Excel (.xlsx) workbook.
 *
 * This is a current-version, script-based importer (the full Excel import/export
 * feature — backlog #7 — will come later with a proper package + admin UI).
 *
 * It parses the workbook with zero xlsx dependencies (system `unzip` + a small
 * OOXML reader), lets you pick which sheets to import, and upserts idempotently:
 * re-importing the same file yields the same result.
 *
 * Expected columns per sheet (row 1 is the header, skipped):
 *   A 主分類(國家)  B 次分類(地區)  C 標籤  D 行程名稱  E 價格  F 行程簡介  G 備註(ignored)
 *
 * Usage is documented in ./import-tours.sh (the entry point).
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { PrismaClient } from "../src/generated/prisma/client";

expand(config({ path: ".env.local" }));

// ----------------------------------------------------------------------------
// CLI args
// ----------------------------------------------------------------------------
interface Args {
  file?: string;
  sheets?: string; // comma-separated names, or "all"
  list: boolean;
  dryRun: boolean;
  yes: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { list: false, dryRun: false, yes: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") args.list = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--yes" || a === "-y") args.yes = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--sheets") args.sheets = argv[++i];
    else if (a.startsWith("--sheets=")) args.sheets = a.slice("--sheets=".length);
    else if (!a.startsWith("-") && !args.file) args.file = a;
    else throw new Error(`未知參數：${a}`);
  }
  return args;
}

const HELP = `用法：scripts/import-tours.sh <xlsx 路徑> [選項]

選項：
  --list                列出工作表與資料筆數後結束
  --sheets "國旅,泰國"   指定要匯入的工作表（逗號分隔），或 all 匯入全部
  --dry-run             只解析並印報告，不寫入資料庫
  --yes, -y             跳過寫入前的資料庫確認
  --help, -h            顯示此說明

不給 --sheets 時會列出工作表供互動式選擇。`;

// ----------------------------------------------------------------------------
// Minimal OOXML (.xlsx) reader — system unzip + regex, no dependencies
// ----------------------------------------------------------------------------
function unzipMember(file: string, member: string): string {
  return execFileSync("unzip", ["-p", file, member], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}

function listMembers(file: string): string[] {
  return execFileSync("unzip", ["-Z1", file], { encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function unescapeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Concatenate every <t> inside a fragment, ignoring phonetic (<rPh>) runs. */
function collectText(fragment: string): string {
  const noPhonetic = fragment.replace(/<rPh[\s\S]*?<\/rPh>/g, "");
  let out = "";
  for (const m of noPhonetic.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
    out += unescapeXml(m[1]);
  }
  return out;
}

function parseSharedStrings(file: string, members: string[]): string[] {
  if (!members.includes("xl/sharedStrings.xml")) return [];
  const xml = unzipMember(file, "xl/sharedStrings.xml");
  const result: string[] = [];
  for (const m of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)) {
    result.push(m[1] ? collectText(m[1]) : "");
  }
  return result;
}

interface SheetRef {
  name: string;
  path: string; // e.g. xl/worksheets/sheet1.xml
}

function getSheetRefs(file: string): SheetRef[] {
  const rels = unzipMember(file, "xl/_rels/workbook.xml.rels");
  const ridToTarget = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*\/>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) {
      const path = target.startsWith("/")
        ? target.slice(1)
        : `xl/${target.replace(/^\.\//, "")}`;
      ridToTarget.set(id, path);
    }
  }
  const wb = unzipMember(file, "xl/workbook.xml");
  const sheets: SheetRef[] = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*\/>/g)) {
    const name = /name="([^"]*)"/.exec(m[0])?.[1];
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1];
    if (name && rid && ridToTarget.has(rid)) {
      sheets.push({ name: unescapeXml(name), path: ridToTarget.get(rid)! });
    }
  }
  return sheets;
}

type Row = Record<string, string>; // column letter -> value

function colLetter(ref: string): string {
  return ref.replace(/[0-9]+$/, "");
}

function parseSheet(file: string, sheet: SheetRef, shared: string[]): Row[] {
  const xml = unzipMember(file, sheet.path);
  const body = /<sheetData\b[^>]*>([\s\S]*?)<\/sheetData>/.exec(xml)?.[1] ?? "";
  const rows: Row[] = [];
  for (const rm of body.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g)) {
    const inner = rm[1] ?? "";
    const cells: Row = {};
    for (const cm of inner.matchAll(/<c\b[^>]*>[\s\S]*?<\/c>|<c\b[^>]*\/>/g)) {
      const cellXml = cm[0];
      const ref = /\br="([A-Z]+[0-9]+)"/.exec(cellXml)?.[1];
      if (!ref) continue;
      const type = /\bt="([^"]+)"/.exec(cellXml)?.[1];
      let value: string | undefined;
      const isBlock = /<is\b[^>]*>([\s\S]*?)<\/is>/.exec(cellXml);
      if (isBlock) {
        value = collectText(isBlock[1]);
      } else {
        const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cellXml)?.[1];
        if (v !== undefined) {
          if (type === "s") value = shared[parseInt(v, 10)] ?? "";
          else value = unescapeXml(v);
        }
      }
      if (value !== undefined) cells[colLetter(ref)] = value;
    }
    rows.push(cells);
  }
  return rows;
}

// ----------------------------------------------------------------------------
// Row normalisation
// ----------------------------------------------------------------------------
interface TourRecord {
  region: string;
  subRegion: string;
  name: string;
  price: number;
  tags: string[];
  description: string | null;
  sheet: string;
  rowNum: number; // 1-based row in the sheet (for error reporting)
}

interface RowError {
  sheet: string;
  rowNum: number;
  reason: string;
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** Turn parsed rows of the selected sheets into normalised, de-duplicated records. */
function normalise(
  sheetsData: { name: string; rows: Row[] }[],
): { records: TourRecord[]; errors: RowError[]; duplicates: RowError[] } {
  const records: TourRecord[] = [];
  const errors: RowError[] = [];
  const duplicates: RowError[] = [];
  const seenKeys = new Set<string>();

  for (const { name: sheetName, rows } of sheetsData) {
    for (let i = 1; i < rows.length; i++) {
      // skip header (row index 0)
      const r = rows[i];
      const rowNum = i + 1; // 1-based, matches Excel row number
      const region = (r.A ?? "").trim();
      const subRegion = (r.B ?? "").trim();
      const tourName = (r.D ?? "").trim();

      // Fully empty rows are silently skipped; partially empty ones are errors.
      if (!region && !subRegion && !tourName && !(r.E ?? "").trim()) continue;
      if (!tourName) continue; // no tour name -> not a data row
      if (!region || !subRegion) {
        errors.push({ sheet: sheetName, rowNum, reason: "缺少主分類或次分類" });
        continue;
      }
      const price = parsePrice(r.E ?? "");
      if (price === null) {
        errors.push({
          sheet: sheetName,
          rowNum,
          reason: `價格無法解析：「${(r.E ?? "").trim()}」`,
        });
        continue;
      }

      const key = `${region} ${subRegion} ${tourName}`;
      if (seenKeys.has(key)) {
        duplicates.push({
          sheet: sheetName,
          rowNum,
          reason: `與先前的行程重複（${region} / ${subRegion} / ${tourName}），已跳過`,
        });
        continue;
      }
      seenKeys.add(key);

      const description = (r.F ?? "").length > 0 ? r.F : null;
      records.push({
        region,
        subRegion,
        name: tourName,
        price,
        tags: parseTags(r.C),
        description,
        sheet: sheetName,
        rowNum,
      });
    }
  }
  return { records, errors, duplicates };
}

// ----------------------------------------------------------------------------
// Prompt helpers
// ----------------------------------------------------------------------------
function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (a) => {
      rl.close();
      resolve(a.trim());
    }),
  );
}

// ----------------------------------------------------------------------------
// DB upsert
// ----------------------------------------------------------------------------
function randSlug(): string {
  return randomBytes(4).toString("hex");
}

class Importer {
  private regionCache = new Map<string, string>(); // name -> id
  private subCache = new Map<string, string>(); // regionId\0name -> id
  private tagCache = new Map<string, string>(); // name -> id

  createdRegions = 0;
  createdSubs = 0;
  createdTags = 0;
  createdTours = 0;
  overwrittenTours = 0;

  constructor(
    private db: PrismaClient,
    private dryRun: boolean,
  ) {}

  private async uniqueTourSlug(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const slug = randSlug();
      if (!(await this.db.tour.findUnique({ where: { slug } }))) return slug;
    }
    throw new Error("無法產生唯一的行程 slug");
  }

  private async getRegionId(name: string): Promise<string> {
    const cached = this.regionCache.get(name);
    if (cached) return cached;
    const existing = await this.db.region.findUnique({ where: { name } });
    if (existing) {
      this.regionCache.set(name, existing.id);
      return existing.id;
    }
    if (this.dryRun) {
      this.createdRegions++;
      const placeholder = `dry:region:${name}`;
      this.regionCache.set(name, placeholder);
      return placeholder;
    }
    // Random slug; unique globally. Retry on the rare collision.
    for (let i = 0; i < 8; i++) {
      const slug = randSlug();
      if (await this.db.region.findUnique({ where: { slug } })) continue;
      const created = await this.db.region.create({ data: { name, slug } });
      this.regionCache.set(name, created.id);
      this.createdRegions++;
      return created.id;
    }
    throw new Error("無法產生唯一的主分類 slug");
  }

  private async getSubRegionId(regionId: string, name: string): Promise<string> {
    const key = `${regionId} ${name}`;
    const cached = this.subCache.get(key);
    if (cached) return cached;
    if (!regionId.startsWith("dry:")) {
      const existing = await this.db.subRegion.findFirst({
        where: { regionId, name },
      });
      if (existing) {
        this.subCache.set(key, existing.id);
        return existing.id;
      }
    }
    if (this.dryRun) {
      this.createdSubs++;
      const placeholder = `dry:sub:${key}`;
      this.subCache.set(key, placeholder);
      return placeholder;
    }
    // Random slug; unique within the region.
    for (let i = 0; i < 8; i++) {
      const slug = randSlug();
      if (await this.db.subRegion.findFirst({ where: { regionId, slug } })) continue;
      const created = await this.db.subRegion.create({
        data: { regionId, name, slug },
      });
      this.subCache.set(key, created.id);
      this.createdSubs++;
      return created.id;
    }
    throw new Error("無法產生唯一的次分類 slug");
  }

  private async getTagId(name: string): Promise<string> {
    const cached = this.tagCache.get(name);
    if (cached) return cached;
    const existing = await this.db.tag.findUnique({ where: { name } });
    if (existing) {
      this.tagCache.set(name, existing.id);
      return existing.id;
    }
    if (this.dryRun) {
      this.createdTags++;
      const placeholder = `dry:tag:${name}`;
      this.tagCache.set(name, placeholder);
      return placeholder;
    }
    const created = await this.db.tag.create({ data: { name } });
    this.tagCache.set(name, created.id);
    this.createdTags++;
    return created.id;
  }

  async importRecord(rec: TourRecord): Promise<void> {
    const regionId = await this.getRegionId(rec.region);
    const subRegionId = await this.getSubRegionId(regionId, rec.subRegion);
    const tagIds: string[] = [];
    for (const t of rec.tags) tagIds.push(await this.getTagId(t));

    // In dry-run over placeholder (not-yet-created) parents, the tour is new.
    const existing = subRegionId.startsWith("dry:")
      ? null
      : await this.db.tour.findFirst({ where: { subRegionId, name: rec.name } });

    if (existing) {
      // Full overwrite of file-derived columns, including resetting published
      // to false. Thumbnail / content files / SEO are not in the sheet and are
      // left untouched (edited in the admin panel after import).
      if (!this.dryRun) {
        await this.db.tour.update({
          where: { id: existing.id },
          data: {
            price: rec.price,
            description: rec.description,
            published: false,
            tags: { set: tagIds.map((id) => ({ id })) },
          },
        });
      }
      this.overwrittenTours++;
    } else {
      if (!this.dryRun) {
        const slug = await this.uniqueTourSlug();
        await this.db.tour.create({
          data: {
            name: rec.name,
            slug,
            price: rec.price,
            description: rec.description,
            subRegionId,
            published: false,
            tags: tagIds.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
          },
        });
      }
      this.createdTours++;
    }
  }
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  if (!args.file) {
    console.error("錯誤：請提供 xlsx 檔案路徑。\n\n" + HELP);
    process.exitCode = 1;
    return;
  }

  const members = listMembers(args.file);
  const shared = parseSharedStrings(args.file, members);
  const allSheets = getSheetRefs(args.file);

  // Parse every sheet once so we can report data counts.
  const parsed = allSheets.map((s) => ({
    ref: s,
    rows: parseSheet(args.file!, s, shared),
  }));
  const dataCount = (rows: Row[]) =>
    rows.slice(1).filter((r) => (r.D ?? "").trim()).length;

  if (args.list) {
    console.log(`工作表（共 ${parsed.length} 張）：`);
    parsed.forEach((p, i) =>
      console.log(`  ${String(i + 1).padStart(2)}. ${p.ref.name}  （${dataCount(p.rows)} 筆）`),
    );
    return;
  }

  // ---- decide which sheets to import ----
  let selected: typeof parsed;
  if (args.sheets) {
    if (args.sheets.trim().toLowerCase() === "all") {
      selected = parsed;
    } else {
      const wanted = args.sheets.split(",").map((s) => s.trim()).filter(Boolean);
      const known = new Map(parsed.map((p) => [p.ref.name, p]));
      const missing = wanted.filter((w) => !known.has(w));
      if (missing.length) {
        console.error(`錯誤：找不到工作表：${missing.join("、")}`);
        console.error(`可用工作表：${parsed.map((p) => p.ref.name).join("、")}`);
        process.exitCode = 1;
        return;
      }
      selected = wanted.map((w) => known.get(w)!);
    }
  } else {
    // interactive selection
    console.log(`工作表（共 ${parsed.length} 張）：`);
    parsed.forEach((p, i) =>
      console.log(`  ${String(i + 1).padStart(2)}. ${p.ref.name}  （${dataCount(p.rows)} 筆）`),
    );
    const answer = await ask("\n輸入要匯入的編號（逗號分隔）或 all： ");
    if (answer.trim().toLowerCase() === "all") {
      selected = parsed;
    } else {
      const idx = answer
        .split(",")
        .map((s) => parseInt(s.trim(), 10) - 1)
        .filter((n) => n >= 0 && n < parsed.length);
      if (!idx.length) {
        console.error("錯誤：未選擇任何有效工作表。");
        process.exitCode = 1;
        return;
      }
      selected = [...new Set(idx)].map((i) => parsed[i]);
    }
  }

  // ---- normalise + de-duplicate ----
  const { records, errors, duplicates } = normalise(
    selected.map((s) => ({ name: s.ref.name, rows: s.rows })),
  );

  console.log(`\n選取工作表：${selected.map((s) => s.ref.name).join("、")}`);
  console.log(
    `可匯入行程：${records.length}　檔案內重複略過：${duplicates.length}　資料錯誤：${errors.length}`,
  );

  if (records.length === 0) {
    console.log("沒有可匯入的行程，結束。");
    reportProblems(errors, duplicates);
    return;
  }

  // ---- DB target confirmation ----
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("錯誤：未設定 DATABASE_URL（請確認 web/.env.local）。");
    process.exitCode = 1;
    return;
  }
  let target = dbUrl;
  try {
    const u = new URL(dbUrl);
    target = `${u.host}${u.pathname}`;
  } catch {
    /* keep raw */
  }

  if (args.dryRun) {
    console.log(`\n[DRY-RUN] 目標資料庫：${target}（不會寫入）`);
  } else {
    console.log(`\n即將寫入資料庫：${target}`);
    if (!args.yes) {
      const confirm = await ask("確定要寫入嗎？(y/N) ");
      if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
        console.log("已取消。");
        return;
      }
    }
  }

  // ---- upsert ----
  const db = new PrismaClient();
  const importer = new Importer(db, args.dryRun);
  const runtimeErrors: RowError[] = [];
  try {
    for (const rec of records) {
      try {
        await importer.importRecord(rec);
      } catch (e) {
        runtimeErrors.push({
          sheet: rec.sheet,
          rowNum: rec.rowNum,
          reason: `寫入失敗：${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
  } finally {
    await db.$disconnect();
  }

  // ---- report ----
  const tag = args.dryRun ? "[DRY-RUN] 預計" : "完成";
  console.log(`\n=== ${tag} ===`);
  console.log(`主分類 新建：${importer.createdRegions}`);
  console.log(`次分類 新建：${importer.createdSubs}`);
  console.log(`標籤   新建：${importer.createdTags}`);
  console.log(`行程   新建：${importer.createdTours}`);
  console.log(`行程   覆蓋：${importer.overwrittenTours}`);
  reportProblems([...errors, ...runtimeErrors], duplicates);
}

function reportProblems(errors: RowError[], duplicates: RowError[]) {
  if (duplicates.length) {
    console.log(`\n檔案內重複（已跳過，共 ${duplicates.length}）：`);
    for (const d of duplicates) console.log(`  [${d.sheet}] 第 ${d.rowNum} 列：${d.reason}`);
  }
  if (errors.length) {
    console.log(`\n錯誤列（共 ${errors.length}）：`);
    for (const e of errors) console.log(`  [${e.sheet}] 第 ${e.rowNum} 列：${e.reason}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
