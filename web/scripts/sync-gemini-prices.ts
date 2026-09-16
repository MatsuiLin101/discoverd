/**
 * Sync Gemini token prices from the Google Cloud Pricing API into the
 * (append-only) GeminiModelPrice history. Manual dev/ops tool; the admin panel
 * has a button for the same thing (rate-limited to once a day).
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
import { syncGeminiPrices, DEFAULT_SYNC_CURRENCIES } from "@/lib/ai/gemini-price-sync";

expand(config({ path: ".env.local" }));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const currenciesArg = args.find((a) => a.startsWith("--currencies="));
const currencies = currenciesArg
  ? currenciesArg
      .split("=")[1]
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)
  : DEFAULT_SYNC_CURRENCIES;

async function main() {
  const result = await syncGeminiPrices({ currencies, dryRun });
  console.log(
    `同步完成${dryRun ? "（--dry-run，不寫入）" : ""}：`,
    { models: result.models, inserted: result.inserted, ranAt: result.ranAt.toISOString() },
  );
  for (const e of result.errors) console.warn("  ⚠", e);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
