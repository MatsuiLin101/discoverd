/**
 * Find candidate Gemini token-price SKUs by keyword, to fill MODEL_SKU_MAP.
 * Lists the service's SKUs whose displayName contains every query word plus
 * "input" or "output", so you can pick the standard text input/output SKU ids.
 *
 * Requires GOOGLE_CLOUD_API_KEY in .env.local.
 *
 * Usage:
 *   npx tsx scripts/find-gemini-sku.ts "3.6 flash text"
 *
 * Tip: add "text" to the query and ignore rows mentioning audio/video/image,
 * flex/priority/batch, or caching — you want the plain standard text SKUs.
 */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { db } from "@/lib/db";
import { listGeminiSkus } from "@/lib/ai/gemini-pricing";

expand(config({ path: ".env.local" }));

async function main() {
  const query = process.argv.slice(2).join(" ").trim().toLowerCase();
  if (!query) throw new Error('請提供關鍵字，例如：npx tsx scripts/find-gemini-sku.ts "3.6 flash text"');
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) throw new Error("缺少 GOOGLE_CLOUD_API_KEY");

  const words = query.split(/\s+/);
  const skus = await listGeminiSkus(apiKey);
  const matches = skus.filter((s) => {
    const name = s.displayName.toLowerCase();
    const hasAllWords = words.every((w) => name.includes(w));
    const isInputOrOutput = name.includes("input") || name.includes("output");
    return hasAllWords && isInputOrOutput;
  });

  console.log(`共 ${skus.length} 個 SKU，符合「${query}」且含 input/output 的有 ${matches.length} 筆：`);
  for (const m of matches) console.log(`  ${m.skuId}\t${m.displayName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
