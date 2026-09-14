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

/** Update an existing usage row (used when an async thumbnail task finishes). */
export async function updateAiUsageByTaskId(
  taskId: string,
  data: Partial<Pick<AiUsageCreate, "status" | "latencyMs" | "resultRef" | "error">>,
) {
  try {
    await db.aiUsageLog.updateMany({ where: { taskId }, data });
  } catch (e) {
    console.error("[updateAiUsageByTaskId]", e);
  }
}
