-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "orgAddress" TEXT,
ADD COLUMN     "orgPriceRange" TEXT NOT NULL DEFAULT '$$',
ADD COLUMN     "orgTelephone" TEXT;
