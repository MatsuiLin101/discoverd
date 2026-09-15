import { db } from "@/lib/db";
import type { AiGenerationKind, AiUsageStatus, Prisma } from "@/generated/prisma/client";

/**
 * Durable AI usage/cost audit trail. Unlike AiGeneration candidates (capped and
 * user-deletable), these rows are write-once and never pruned by that lifecycle.
 */

export interface AiUsageCreate {
  userId: string | null;
  userAccount: string;
  tourId: string | null;
  tourName: string;
  kind: AiGenerationKind;
  provider: "gemini" | "manus";
  model?: string | null;
  status: AiUsageStatus;
  hint?: string | null;
  promptOverridden?: boolean;
  promptText?: string | null;
  pdfCount?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  thoughtsTokens?: number | null;
  totalTokens?: number | null;
  taskId?: string | null;
  agentProfile?: string | null;
  keyOwner?: string | null;
  latencyMs?: number | null;
  resultRef?: string | null;
  outputChars?: number | null;
  error?: string | null;
}

/** Insert a usage row; never throws into the caller's happy path. */
export async function logAiUsage(data: AiUsageCreate) {
  try {
    return await db.aiUsageLog.create({ data: data as Prisma.AiUsageLogUncheckedCreateInput });
  } catch (e) {
    console.error("[logAiUsage]", e);
    return null;
  }
}

/**
 * Finalise the PENDING usage row for an async thumbnail task (found by taskId),
 * filling in latency from when the row was created. No-op if the row is missing.
 */
export async function finishAiUsageByTaskId(
  taskId: string,
  data: { status: AiUsageStatus; resultRef?: string | null; error?: string | null },
) {
  try {
    const row = await db.aiUsageLog.findFirst({ where: { taskId } });
    if (!row) return;
    await db.aiUsageLog.update({
      where: { id: row.id },
      data: { ...data, latencyMs: Date.now() - row.createdAt.getTime() },
    });
  } catch (e) {
    console.error("[finishAiUsageByTaskId]", e);
  }
}
