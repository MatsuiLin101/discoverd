/**
 * One-off backfill: fill AiUsageLog.creditsUsed with the REAL credit usage that
 * Manus reports per task, replacing the per-profile estimate written at task
 * completion time.
 *
 * How it works:
 *   - Finds Manus usage rows that carry a taskId but no creditsUsed yet.
 *   - Reads the true `credit_usage` from GET /v2/task.detail for each task.
 *   - A task can only be read with a key from the account that created it, so
 *     the key is chosen by keyOwner:
 *       "personal"                          -> that user's personal Manus key
 *       "shared" | "fallback_*" | (unset)   -> the shared Manus key
 *   - Only rows where Manus actually returns a number are updated; tasks that
 *     consumed no credits, that Manus no longer retains, or whose key is
 *     unavailable are left untouched and reported as skipped.
 *
 * Idempotent: rows that already have creditsUsed are ignored. Safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/backfill-manus-credits.ts [--dry-run] [--limit=N]
 */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { db } from "@/lib/db";
import { getAiKeys, getUserAiKeys } from "@/lib/ai/config";
import { getTaskDetail } from "@/lib/ai/manus";

expand(config({ path: ".env.local" }));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

/** Which stored key can read a task created under this keyOwner. */
function usesPersonalKey(keyOwner: string | null): boolean {
  return keyOwner === "personal";
}

async function main() {
  const shared = await getAiKeys();

  const rows = await db.aiUsageLog.findMany({
    where: {
      provider: "manus",
      taskId: { not: null },
      creditsUsed: null,
    },
    orderBy: { createdAt: "asc" },
    ...(limit ? { take: limit } : {}),
    select: {
      id: true,
      taskId: true,
      userId: true,
      keyOwner: true,
      userAccount: true,
      tourName: true,
      agentProfile: true,
      createdAt: true,
    },
  });

  console.log(
    `找到 ${rows.length} 筆待回填的 Manus 任務記錄${dryRun ? "（--dry-run，不寫入）" : ""}`,
  );

  // Cache personal keys per user so we don't decrypt repeatedly.
  const personalKeyCache = new Map<string, string | null>();
  async function personalKeyFor(userId: string): Promise<string | null> {
    if (!personalKeyCache.has(userId)) {
      const keys = await getUserAiKeys(userId);
      personalKeyCache.set(userId, keys.manus);
    }
    return personalKeyCache.get(userId) ?? null;
  }

  let updated = 0;
  let noCredit = 0;
  let noKey = 0;
  let notFound = 0;

  for (const row of rows) {
    const taskId = row.taskId!;

    let apiKey: string | null;
    if (usesPersonalKey(row.keyOwner)) {
      apiKey = row.userId ? await personalKeyFor(row.userId) : null;
    } else {
      apiKey = shared.manus;
    }

    if (!apiKey) {
      noKey++;
      console.warn(
        `  ⚠ 跳過 ${taskId}（${row.userAccount} · ${row.tourName}）：找不到可用的 ${row.keyOwner ?? "shared"} 金鑰`,
      );
      continue;
    }

    const detail = await getTaskDetail({ apiKey, taskId });
    if (!detail) {
      notFound++;
      console.warn(`  ⚠ 跳過 ${taskId}：Manus 查無此任務（可能已逾保留期或金鑰不符）`);
      continue;
    }
    if (detail.creditUsage == null) {
      noCredit++;
      console.log(`  · ${taskId}：Manus 未回報 credit_usage（status=${detail.status ?? "?"}），略過`);
      continue;
    }

    if (!dryRun) {
      await db.aiUsageLog.update({
        where: { id: row.id },
        data: { creditsUsed: detail.creditUsage },
      });
    }
    updated++;
    console.log(
      `  ✓ ${taskId}（${row.tourName}）：creditsUsed = ${detail.creditUsage}${dryRun ? "（未寫入）" : ""}`,
    );
  }

  console.log("回填完成：", {
    total: rows.length,
    updated,
    noCredit,
    noKey,
    notFound,
    dryRun,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
