/**
 * Client for the Google Cloud Pricing API (v2beta list / v1beta price get),
 * used to fetch public Gemini token prices. Public SKUs need only an API key
 * (no IAM). The API is Pre-GA, so callers should sync into the local
 * GeminiModelPrice cache rather than call it per request.
 *
 * Docs: https://docs.cloud.google.com/billing/docs/how-to/get-pricing-information-api
 */

const BASE = "https://cloudbilling.googleapis.com";

/** Gemini API service in the Cloud Billing catalog. */
export const GEMINI_SERVICE_ID = "AEFD-7695-64FA";

/**
 * Which SKUs price a model's standard (non-cached, non-batch) text input and
 * output. Extend this when adding models; discover SKU ids with `listGeminiSkus`
 * (match the displayName) or from the Cloud billing catalog.
 */
export const MODEL_SKU_MAP: Record<string, { inputSkuId: string; outputSkuId: string }> = {
  "gemini-3.6-flash": { inputSkuId: "2F9F-F0E4-699C", outputSkuId: "90DC-1471-C3D3" },
};

export interface GeminiSku {
  skuId: string;
  displayName: string;
}

/** List the Gemini API service's SKUs (for discovery / verifying the map). */
export async function listGeminiSkus(apiKey: string): Promise<GeminiSku[]> {
  const skus: GeminiSku[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${BASE}/v2beta/skus`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("filter", `service="services/${GEMINI_SERVICE_ID}"`);
    url.searchParams.set("pageSize", "5000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(`skus.list 失敗：${body?.error?.message ?? `HTTP ${res.status}`}`);
    }
    for (const s of body?.skus ?? []) {
      if (s?.skuId) skus.push({ skuId: s.skuId, displayName: s.displayName ?? "" });
    }
    pageToken = body?.nextPageToken || undefined;
  } while (pageToken);
  return skus;
}

/**
 * Fetch the current price for one SKU, normalised to price-per-1M-tokens in the
 * requested currency. Returns null if the SKU has no usable rate.
 *
 * The rate's listPrice is a google.type.Money ({units, nanos}) charged per
 * `unitInfo.unitQuantity` units, so price-per-token = money / unitQuantity and
 * price-per-million = that * 1e6 — robust whether the SKU is quoted per token
 * or per 1M tokens.
 */
export async function getSkuPricePerM(
  apiKey: string,
  skuId: string,
  currencyCode: string,
): Promise<{ pricePerM: number; raw: unknown } | null> {
  const url = new URL(`${BASE}/v1beta/skus/${encodeURIComponent(skuId)}/price`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("currencyCode", currencyCode);
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`skus.price.get(${skuId}) 失敗：${body?.error?.message ?? `HTTP ${res.status}`}`);
  }
  const rate = body?.rate;
  const tiers: Array<Record<string, unknown>> = rate?.tiers ?? [];
  if (tiers.length === 0) return null;
  // Use the highest applicable tier's list price (token SKUs are single-tier).
  const tier = tiers[tiers.length - 1] as { listPrice?: { units?: string; nanos?: number } };
  const listPrice = tier.listPrice;
  if (!listPrice) return null;
  const money = Number(listPrice.units ?? 0) + Number(listPrice.nanos ?? 0) / 1e9;
  const unitQuantity = Number(rate?.unitInfo?.unitQuantity?.value ?? 1) || 1;
  const pricePerM = (money / unitQuantity) * 1_000_000;
  return { pricePerM, raw: body };
}
