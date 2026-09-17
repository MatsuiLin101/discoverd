-- Gemini token prices now come from the synced GeminiModelPrice table.
ALTER TABLE "SiteSetting" DROP COLUMN "aiGeminiInputPricePerM",
DROP COLUMN "aiGeminiOutputPricePerM";
