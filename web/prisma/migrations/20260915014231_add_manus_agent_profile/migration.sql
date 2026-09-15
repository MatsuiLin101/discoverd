-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "aiThumbnailAgentProfile" TEXT NOT NULL DEFAULT 'standard';

-- AlterTable
ALTER TABLE "UserAiPreference" ADD COLUMN     "thumbnailAgentProfile" TEXT;
