/**
 * Sync Gemini token prices from the Google Cloud Pricing API into the local
 * GeminiModelPrice cache. Manual for now; wire it to a scheduler later.
 *
 * For each model in MODEL_SKU_MAP it fetches the input and output SKU prices in
 * each requested currency and upserts one row per (model, currency).
 *
 * Requires a Google Cloud API key with the Cloud Billing API enabled:
 *   GOOGLE_CLOUD_API_KEY=...   (in .env.local)
 * Public SKUs need no IAM permissions — an API key is enough.
 *
 * Usage:
 *   npx tsx scripts/sync-gemini-prices.ts [--dry-run] [--currencies=USD,TWD]
 */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { db } from "@/lib/db";
import { MODEL_SKU_MAP, getSkuPricePerM } from "@/lib/ai/gemini-pricing";

expand(config({ path: ".env.local" }));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const currenciesArg = args.find((a) => a.startsWith("--currencies="));
const currencies = (currenciesArg ? currenciesArg.split("=")[1] : "USD,TWD")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

async function main() {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 GOOGLE_CLOUD_API_KEY，請於 .env.local 設定 Google Cloud API key");
  }

  console.log(
    `同步 ${Object.keys(MODEL_SKU_MAP).length} 個模型 × ${currencies.join("/")} 價格${dryRun ? "（--dry-run，不寫入）" : ""}`,
  );

  let updated = 0;
  let failed = 0;

  for (const [model, sku] of Object.entries(MODEL_SKU_MAP)) {
    for (const currency of currencies) {
      try {
        const [input, output] = await Promise.all([
          getSkuPricePerM(apiKey, sku.inputSkuId, currency),
          getSkuPricePerM(apiKey, sku.outputSkuId, currency),
        ]);
        if (!input || !output) {
          failed++;
          console.warn(`  ⚠ ${model} (${currency})：SKU 未回報可用價格，略過`);
          continue;
        }
        console.log(
          `  ✓ ${model} (${currency})：input ${input.pricePerM}/M、output ${output.pricePerM}/M${dryRun ? "（未寫入）" : ""}`,
        );
        if (!dryRun) {
          await db.geminiModelPrice.upsert({
            where: { model_currency: { model, currency } },
            create: {
              model,
              currency,
              inputPerM: input.pricePerM,
              outputPerM: output.pricePerM,
              inputSkuId: sku.inputSkuId,
              outputSkuId: sku.outputSkuId,
            },
            update: {
              inputPerM: input.pricePerM,
              outputPerM: output.pricePerM,
              inputSkuId: sku.inputSkuId,
              outputSkuId: sku.outputSkuId,
              fetchedAt: new Date(),
            },
          });
        }
        updated++;
      } catch (e) {
        failed++;
        console.error(`  ✗ ${model} (${currency})：${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  console.log("同步完成：", { updated, failed, dryRun });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
