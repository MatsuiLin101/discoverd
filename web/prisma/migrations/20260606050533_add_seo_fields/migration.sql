-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "ogImagePublicId" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AlterTable
ALTER TABLE "SubRegion" ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "ogImagePublicId" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "ogImagePublicId" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;
