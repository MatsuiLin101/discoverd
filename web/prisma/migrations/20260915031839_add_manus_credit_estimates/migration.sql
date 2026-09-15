-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "aiManusCreditsLite" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "aiManusCreditsMax" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "aiManusCreditsStandard" INTEGER NOT NULL DEFAULT 22;
