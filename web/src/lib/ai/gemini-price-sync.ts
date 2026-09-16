import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { MODEL_SKU_MAP, getSkuPricePerM } from "@/lib/ai/gemini-pricing";

export const DEFAULT_SYNC_CURRENCIES = ["USD", "TWD"];

export interface GeminiSyncResult {
  syncId: string;
  ranAt: Date;
  models: string[]; // models that got at least one price row
  inserted: number; // number of price rows written
  errors: string[];
}

/**
 * Fetch current Gemini token prices from the Cloud Pricing API and append them
 * to GeminiModelPrice (one row per model + currency, tagged with a shared
 * syncId). Append-only: history is preserved; the current price is the latest
 * row. Requires GOOGLE_CLOUD_API_KEY. `dryRun` fetches without writing.
 */
export async function syncGeminiPrices(opts?: {
  currencies?: string[];
  dryRun?: boolean;
}): Promise<GeminiSyncResult> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) throw new Error("缺少 GOOGLE_CLOUD_API_KEY");

  const currencies = opts?.currencies ?? DEFAULT_SYNC_CURRENCIES;
  const syncId = randomUUID();
  const ranAt = new Date();
  const models = new Set<string>();
  const errors: string[] = [];
  const toInsert: Array<{
    syncId: string;
    model: string;
    currency: string;
    inputPerM: number;
    outputPerM: number;
    inputSkuId: string;
    outputSkuId: string;
    fetchedAt: Date;
  }> = [];

  for (const [model, sku] of Object.entries(MODEL_SKU_MAP)) {
    for (const currency of currencies) {
      try {
        const [input, output] = await Promise.all([
          getSkuPricePerM(apiKey, sku.inputSkuId, currency),
          getSkuPricePerM(apiKey, sku.outputSkuId, currency),
        ]);
        if (!input || !output) {
          errors.push(`${model} (${currency}): SKU 未回報價格`);
          continue;
        }
        models.add(model);
        toInsert.push({
          syncId,
          model,
          currency,
          inputPerM: input.pricePerM,
          outputPerM: output.pricePerM,
          inputSkuId: sku.inputSkuId,
          outputSkuId: sku.outputSkuId,
          fetchedAt: ranAt,
        });
      } catch (e) {
        errors.push(`${model} (${currency}): ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  if (!opts?.dryRun && toInsert.length > 0) {
    await db.geminiModelPrice.createMany({ data: toInsert });
  }

  return { syncId, ranAt, models: [...models], inserted: toInsert.length, errors };
}

/** Current price rows (latest per model + currency), for display. */
export async function getCurrentGeminiPrices() {
  return db.geminiModelPrice.findMany({
    distinct: ["model", "currency"],
    orderBy: { fetchedAt: "desc" },
    select: { model: true, currency: true, inputPerM: true, outputPerM: true, fetchedAt: true },
  });
}

/** When prices were last synced (max fetchedAt), or null if never. */
export async function getLastGeminiSyncAt(): Promise<Date | null> {
  const row = await db.geminiModelPrice.findFirst({
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });
  return row?.fetchedAt ?? null;
}
