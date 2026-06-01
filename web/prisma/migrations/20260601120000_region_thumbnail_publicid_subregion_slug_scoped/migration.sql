-- AlterTable
ALTER TABLE "Region" ADD COLUMN "thumbnailPublicId" TEXT;

-- AlterTable
ALTER TABLE "SubRegion" ADD COLUMN "thumbnailPublicId" TEXT;

-- DropIndex
DROP INDEX "SubRegion_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "SubRegion_regionId_slug_key" ON "SubRegion"("regionId", "slug");
