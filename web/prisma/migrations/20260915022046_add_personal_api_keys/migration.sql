-- AlterTable
ALTER TABLE "AiGeneration" ADD COLUMN     "keyOwner" TEXT;

-- AlterTable
ALTER TABLE "AiUsageLog" ADD COLUMN     "keyOwner" TEXT;

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "aiManusPersonalThreshold" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "UserAiPreference" ADD COLUMN     "geminiApiKeyEnc" TEXT,
ADD COLUMN     "manusApiKeyEnc" TEXT;
