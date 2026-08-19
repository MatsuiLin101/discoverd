/**
 * Shared primitives for the two-phase (preview -> commit) Excel import.
 *
 * A preview stores the normalised rows in a PENDING ImportLog and returns its
 * id as a token; commit loads that batch by token, applies it, and flips the
 * row to COMMITTED. The md5 lets us warn on byte-identical re-uploads.
 */
import { createHash } from "crypto";
import { db } from "@/lib/db";
import type { ImportModule, ImportLog } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export const IMPORT_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export interface RowIssue {
  row: number; // Excel row number
  message: string;
}

/** One preview row shown to the user before committing. */
export interface PreviewRowDisplay {
  row: number;
  action: "create" | "update" | "skip";
  label: string; // main identifier (tag/region/tour name)
  detail?: string; // secondary info (e.g. productId, price)
  duplicate?: boolean; // flagged as a possible duplicate
}

/** The full preview payload returned to the client (module-agnostic shape). */
export interface ImportPreview {
  rows: PreviewRowDisplay[];
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: RowIssue[];
  duplicates: RowIssue[];
}

/** md5 of the uploaded file bytes (hex). */
export function md5Hex(buf: ArrayBuffer | Buffer): string {
  return createHash("md5").update(Buffer.from(buf as ArrayBuffer)).digest("hex");
}

/** Most recent committed import of the same module with an identical md5. */
export async function findPriorImport(
  module: ImportModule,
  md5: string,
): Promise<ImportLog | null> {
  return db.importLog.findFirst({
    where: { module, md5, status: "COMMITTED" },
    orderBy: { committedAt: "desc" },
  });
}

/** Persist a PENDING batch and return its token (ImportLog id). */
export async function createPending(params: {
  module: ImportModule;
  filename: string;
  md5: string;
  payload: Prisma.InputJsonValue;
  summary: Prisma.InputJsonValue;
  userId: string | null;
}): Promise<string> {
  // Best-effort cleanup of this user's stale pending batches for the module.
  await db.importLog.deleteMany({
    where: {
      module: params.module,
      status: "PENDING",
      userId: params.userId,
      createdAt: { lt: new Date(Date.now() - IMPORT_EXPIRY_MS) },
    },
  });
  const log = await db.importLog.create({
    data: {
      module: params.module,
      filename: params.filename,
      md5: params.md5,
      status: "PENDING",
      payload: params.payload,
      summary: params.summary,
      userId: params.userId,
    },
  });
  return log.id;
}

/** Load a PENDING batch by token, validating ownership, status and expiry. */
export async function loadPending(
  token: string,
  module: ImportModule,
  userId: string,
): Promise<{ log: ImportLog } | { error: string }> {
  const log = await db.importLog.findUnique({ where: { id: token } });
  if (!log || log.module !== module) return { error: "找不到匯入批次，請重新上傳" };
  if (log.userId && log.userId !== userId) return { error: "無權存取此匯入批次" };
  if (log.status === "COMMITTED") return { error: "此匯入批次已完成，請重新上傳" };
  if (Date.now() - log.createdAt.getTime() > IMPORT_EXPIRY_MS) {
    return { error: "匯入批次已過期（超過 15 分鐘），請重新上傳" };
  }
  return { log };
}

/** Mark a batch committed with its final counts. */
export async function markCommitted(
  token: string,
  counts: { createdCount: number; updatedCount: number; skippedCount: number },
): Promise<void> {
  await db.importLog.update({
    where: { id: token },
    data: { status: "COMMITTED", committedAt: new Date(), ...counts },
  });
}
