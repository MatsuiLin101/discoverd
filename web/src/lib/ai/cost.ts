import { db } from "@/lib/db";
import { getSiteAiSetting } from "@/lib/ai/config";

/**
 * Snapshot cost of a generation, in USD and TWD. Gemini uses the synced
 * per-model token prices (GeminiModelPrice); Manus uses the admin's per-credit
 * price, which is entered in NT$, so Manus has no USD figure. A currency is null
 * when its price is unavailable.
 */
export async function computeUsageCost(row: {
  provider: string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  thoughtsTokens?: number | null;
  creditsUsed?: number | null;
}): Promise<{ costUsd: number | null; costTwd: number | null }> {
  if (row.provider === "gemini") {
    if (!row.model) return { costUsd: null, costTwd: null };
    // Latest price per currency (the table is append-only history).
    const prices = await db.geminiModelPrice.findMany({
      where: { model: row.model },
      distinct: ["currency"],
      orderBy: { fetchedAt: "desc" },
    });
    const inTok = row.inputTokens ?? 0;
    const outTok = (row.outputTokens ?? 0) + (row.thoughtsTokens ?? 0);
    const cost = (currency: string): number | null => {
      const p = prices.find((x) => x.currency === currency);
      if (!p) return null;
      return (inTok / 1e6) * p.inputPerM + (outTok / 1e6) * p.outputPerM;
    };
    return { costUsd: cost("USD"), costTwd: cost("TWD") };
  }

  if (row.provider === "manus") {
    if (row.creditsUsed == null) return { costUsd: null, costTwd: null };
    const site = await getSiteAiSetting();
    const perCredit = site.aiManusPricePerCredit; // NT$ per credit
    return {
      costUsd: null,
      costTwd: perCredit != null ? row.creditsUsed * perCredit : null,
    };
  }

  return { costUsd: null, costTwd: null };
}
