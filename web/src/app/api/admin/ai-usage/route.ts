import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSiteAiSetting } from "@/lib/ai/config";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;

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

  const [rows, total, sums, costSums, personalCount, byStatus, site, users] = await Promise.all([
    db.aiUsageLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: PAGE_SIZE }),
    db.aiUsageLog.count({ where }),
    db.aiUsageLog.aggregate({
      where,
      _sum: { inputTokens: true, outputTokens: true, thoughtsTokens: true, totalTokens: true, creditsUsed: true },
    }),
    db.aiUsageLog.aggregate({
      where: companyWhere,
      _sum: { inputTokens: true, outputTokens: true, thoughtsTokens: true, creditsUsed: true },
    }),
    db.aiUsageLog.count({ where: { ...where, keyOwner: "personal" } }),
    db.aiUsageLog.groupBy({ by: ["status"], where, _count: { _all: true } }),
    getSiteAiSetting(),
    isAdmin
      ? db.aiUsageLog.groupBy({ by: ["userId", "userAccount"], _count: { _all: true } })
      : Promise.resolve([]),
  ]);

  // Cost is computed only over company-paid usage.
  const inTok = costSums._sum.inputTokens ?? 0;
  const outTok = (costSums._sum.outputTokens ?? 0) + (costSums._sum.thoughtsTokens ?? 0);
  const credits = costSums._sum.creditsUsed ?? 0;
  const hasPrice =
    site.aiGeminiInputPricePerM != null ||
    site.aiGeminiOutputPricePerM != null ||
    site.aiManusPricePerCredit != null;
  const estimatedCost = hasPrice
    ? (inTok / 1e6) * (site.aiGeminiInputPricePerM ?? 0) +
      (outTok / 1e6) * (site.aiGeminiOutputPricePerM ?? 0) +
      credits * (site.aiManusPricePerCredit ?? 0)
    : null;

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
      credits: sums._sum.creditsUsed ?? 0,
      companyCredits: costSums._sum.creditsUsed ?? 0,
      success: statusCounts.SUCCESS ?? 0,
      failed: statusCounts.FAILED ?? 0,
      pending: statusCounts.PENDING ?? 0,
      personalCount,
      estimatedCost,
    },
    users: (users as Array<{ userId: string | null; userAccount: string; _count: { _all: number } }>).map((u) => ({
      userId: u.userId,
      userAccount: u.userAccount,
      count: u._count._all,
    })),
    isAdmin,
  });
}
