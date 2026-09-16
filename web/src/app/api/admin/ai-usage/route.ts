import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAiKeys, getUserAiKeys } from "@/lib/ai/config";
import { getTaskDetail } from "@/lib/ai/manus";
import { computeUsageCost } from "@/lib/ai/cost";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;

type UsageRow = Prisma.AiUsageLogGetPayload<object>;

/**
 * Fill in the real Manus credit usage for finished tasks that were left pending
 * (the task hadn't stopped when the thumbnail image became ready). Best-effort
 * and bounded to the current page: reads task.detail with the key that created
 * each task and writes creditsUsed once the task has stopped.
 */
async function reconcileManusCredits(rows: UsageRow[]) {
  const pending = rows.filter(
    (r) => r.provider === "manus" && r.status === "SUCCESS" && r.creditsUsed == null && r.taskId,
  );
  if (pending.length === 0) return;

  const shared = (await getAiKeys()).manus;
  const personalKeys = new Map<string, string | null>();
  const personalKeyFor = async (userId: string) => {
    if (!personalKeys.has(userId)) personalKeys.set(userId, (await getUserAiKeys(userId)).manus);
    return personalKeys.get(userId) ?? null;
  };

  await Promise.all(
    pending.map(async (r) => {
      const key = r.keyOwner === "personal" ? (r.userId ? await personalKeyFor(r.userId) : null) : shared;
      if (!key) return;
      const detail = await getTaskDetail({ apiKey: key, taskId: r.taskId! });
      if (detail?.status === "stopped" && detail.creditUsage != null) {
        await db.aiUsageLog.update({
          where: { id: r.id },
          data: { creditsUsed: detail.creditUsage, ...(detail.agentProfile ? { agentProfile: detail.agentProfile } : {}) },
        });
        r.creditsUsed = detail.creditUsage; // reflect in this response
        if (detail.agentProfile) r.agentProfile = detail.agentProfile;
      }
    }),
  );
}

/**
 * Snapshot the cost of rows that don't have one yet (historical rows, or a Manus
 * row whose credits were just reconciled). Bounded to the current page; uses the
 * current synced prices. Once written, the value is frozen.
 */
async function backfillCosts(rows: UsageRow[]) {
  const missing = rows.filter((r) => r.costUsd == null && r.costTwd == null);
  await Promise.all(
    missing.map(async (r) => {
      const { costUsd, costTwd } = await computeUsageCost(r);
      if (costUsd == null && costTwd == null) return;
      await db.aiUsageLog.update({ where: { id: r.id }, data: { costUsd, costTwd } });
      r.costUsd = costUsd; // reflect in this response
      r.costTwd = costTwd;
    }),
  );
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

  const isAdmin = session.role === "ADMIN";
  const sp = req.nextUrl.searchParams;

  const where: Prisma.AiUsageLogWhereInput = {};
  // STAFF only ever see their own usage; ADMIN may filter by a chosen user.
  if (!isAdmin) where.userId = session.userId;
  else if (sp.get("userId")) where.userId = sp.get("userId")!;

  const kind = sp.get("kind");
  if (kind === "DESCRIPTION" || kind === "THUMBNAIL") where.kind = kind;
  const status = sp.get("status");
  if (status === "SUCCESS" || status === "FAILED" || status === "PENDING") where.status = status;

  const from = sp.get("from");
  const to = sp.get("to");
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from}T00:00:00`);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
  }

  const page = Math.max(1, Number(sp.get("page")) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  // Company cost excludes usage paid by a user's personal key.
  const companyWhere: Prisma.AiUsageLogWhereInput = { ...where, NOT: { keyOwner: "personal" } };

  const [rows, total, sums, personalCount, byStatus, users] = await Promise.all([
    db.aiUsageLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: PAGE_SIZE }),
    db.aiUsageLog.count({ where }),
    db.aiUsageLog.aggregate({
      where,
      _sum: { inputTokens: true, outputTokens: true, thoughtsTokens: true, totalTokens: true },
    }),
    db.aiUsageLog.count({ where: { ...where, keyOwner: "personal" } }),
    db.aiUsageLog.groupBy({ by: ["status"], where, _count: { _all: true } }),
    isAdmin
      ? db.aiUsageLog.groupBy({ by: ["userId", "userAccount"], _count: { _all: true } })
      : Promise.resolve([]),
  ]);

  // Reconcile Manus credits and snapshot any missing costs, then aggregate so the
  // totals reflect the freshly filled rows. Cost totals are company-paid only.
  await reconcileManusCredits(rows);
  await backfillCosts(rows);
  const [allCreditSum, companyCreditSum, companyCostSum] = await Promise.all([
    db.aiUsageLog.aggregate({ where, _sum: { creditsUsed: true } }),
    db.aiUsageLog.aggregate({ where: companyWhere, _sum: { creditsUsed: true } }),
    db.aiUsageLog.aggregate({ where: companyWhere, _sum: { costUsd: true, costTwd: true } }),
  ]);
  const allCredits = allCreditSum._sum.creditsUsed ?? 0;
  const credits = companyCreditSum._sum.creditsUsed ?? 0;
  const costUsd = companyCostSum._sum.costUsd ?? 0;
  const costTwd = companyCostSum._sum.costTwd ?? 0;

  const statusCounts: Record<string, number> = {};
  for (const g of byStatus) statusCounts[g.status] = g._count._all;

  return NextResponse.json({
    data: rows,
    page,
    pageSize: PAGE_SIZE,
    total,
    summary: {
      count: total,
      inputTokens: sums._sum.inputTokens ?? 0,
      outputTokens: sums._sum.outputTokens ?? 0,
      thoughtsTokens: sums._sum.thoughtsTokens ?? 0,
      totalTokens: sums._sum.totalTokens ?? 0,
      credits: allCredits,
      companyCredits: credits,
      success: statusCounts.SUCCESS ?? 0,
      failed: statusCounts.FAILED ?? 0,
      pending: statusCounts.PENDING ?? 0,
      personalCount,
      costUsd,
      costTwd,
    },
    users: (users as Array<{ userId: string | null; userAccount: string; _count: { _all: number } }>).map((u) => ({
      userId: u.userId,
      userAccount: u.userAccount,
      count: u._count._all,
    })),
    isAdmin,
  });
}
