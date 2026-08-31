/**
 * Frozen business-code / Product ID allocation.
 *
 * Shared by the Excel importer and the admin "create tour" form so both mint
 * ids the same way. All functions take a transaction client so allocation is
 * consistent within a single import batch (rows created earlier in the batch
 * are visible when numbering later ones).
 *
 * Encoding:
 *   Region.code      3 digits, 101+ (global)
 *   SubRegion.code   2 digits, 01+  (within its region)
 *   Tour.productId   regionCode(3) + subCode(2) + YYMMDD(6, UTC+8) + dailySeq(2)
 *
 * A code, once assigned, is frozen (reordering never changes it), so allocation
 * only ever looks at the current maximum and adds one.
 */
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Raised when a (region, subRegion) has used all 99 daily sequence numbers. */
export class DailyQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DailyQuotaError";
  }
}

/** Raised when a region/subRegion code space is exhausted. */
export class CodeSpaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodeSpaceError";
  }
}

/** Format a date as YYMMDD in the Asia/Taipei (UTC+8) timezone. */
export function taipeiYYMMDD(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}${get("month")}${get("day")}`;
}

/** Next free 3-digit region code (101+). */
export async function nextRegionCode(tx: Tx): Promise<string> {
  const rows = await tx.region.findMany({
    where: { code: { not: null } },
    select: { code: true },
  });
  let max = 100;
  for (const r of rows) {
    const n = parseInt(r.code!, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  const next = max + 1;
  if (next > 999) throw new CodeSpaceError("主分類代碼已達上限（999）");
  return String(next);
}

/** Next free 2-digit subRegion code (01+) within a region. */
export async function nextSubCode(tx: Tx, regionId: string): Promise<string> {
  const rows = await tx.subRegion.findMany({
    where: { regionId, code: { not: null } },
    select: { code: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.code!, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  const next = max + 1;
  if (next > 99) throw new CodeSpaceError("次分類代碼已達上限（99）");
  return String(next).padStart(2, "0");
}

/** Return a region's code, assigning one if it has none yet. */
export async function ensureRegionCode(tx: Tx, regionId: string): Promise<string> {
  const region = await tx.region.findUnique({
    where: { id: regionId },
    select: { code: true },
  });
  if (region?.code) return region.code;
  const code = await nextRegionCode(tx);
  await tx.region.update({ where: { id: regionId }, data: { code } });
  return code;
}

/** Return a subRegion's (regionCode, subCode), assigning either if missing. */
export async function ensureSubCode(
  tx: Tx,
  subRegionId: string,
): Promise<{ regionCode: string; subCode: string }> {
  const sub = await tx.subRegion.findUnique({
    where: { id: subRegionId },
    select: { code: true, regionId: true },
  });
  if (!sub) throw new Error("找不到次分類");
  const regionCode = await ensureRegionCode(tx, sub.regionId);
  if (sub.code) return { regionCode, subCode: sub.code };
  const subCode = await nextSubCode(tx, sub.regionId);
  await tx.subRegion.update({ where: { id: subRegionId }, data: { code: subCode } });
  return { regionCode, subCode };
}

/**
 * Allocate a frozen 13-digit productId for a new tour under (regionCode, subCode).
 * Throws DailyQuotaError once the day's 01..99 sequence is exhausted.
 */
export async function allocateProductId(
  tx: Tx,
  regionCode: string,
  subCode: string,
  date: Date = new Date(),
): Promise<string> {
  const prefix = `${regionCode}${subCode}${taipeiYYMMDD(date)}`; // 11 chars
  const rows = await tx.tour.findMany({
    where: { productId: { startsWith: prefix } },
    select: { productId: true },
  });
  let max = 0;
  for (const r of rows) {
    const seq = parseInt(r.productId!.slice(11), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  const next = max + 1;
  if (next > 99) {
    throw new DailyQuotaError(
      `今日「${regionCode}-${subCode}」分類的行程編號已用完（01~99），請明天再新增`,
    );
  }
  return `${prefix}${String(next).padStart(2, "0")}`;
}

/** Convenience: allocate a productId for a tour given only its subRegion. */
export async function allocateTourProductId(
  tx: Tx,
  subRegionId: string,
  date: Date = new Date(),
): Promise<string> {
  const { regionCode, subCode } = await ensureSubCode(tx, subRegionId);
  return allocateProductId(tx, regionCode, subCode, date);
}
