-- Make Gemini prices append-only (keep history), grouped by a sync run id.
DROP INDEX "GeminiModelPrice_model_currency_key";

ALTER TABLE "GeminiModelPrice" DROP COLUMN "updatedAt";
ALTER TABLE "GeminiModelPrice" ADD COLUMN "syncId" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "GeminiModelPrice" ALTER COLUMN "syncId" DROP DEFAULT;

CREATE INDEX "GeminiModelPrice_model_currency_fetchedAt_idx" ON "GeminiModelPrice"("model", "currency", "fetchedAt");
CREATE INDEX "GeminiModelPrice_fetchedAt_idx" ON "GeminiModelPrice"("fetchedAt");
