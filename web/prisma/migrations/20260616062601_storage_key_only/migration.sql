/*
  Warnings:

  - You are about to drop the column `image` on the `HeroBanner` table. All the data in the column will be lost.
  - You are about to drop the column `imagePublicId` on the `HeroBanner` table. All the data in the column will be lost.
  - You are about to drop the column `ogImage` on the `Region` table. All the data in the column will be lost.
  - You are about to drop the column `ogImagePublicId` on the `Region` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `Region` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailPublicId` on the `Region` table. All the data in the column will be lost.
  - You are about to drop the column `ogImage` on the `SubRegion` table. All the data in the column will be lost.
  - You are about to drop the column `ogImagePublicId` on the `SubRegion` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `SubRegion` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailPublicId` on the `SubRegion` table. All the data in the column will be lost.
  - You are about to drop the column `ogImage` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `ogImagePublicId` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailPublicId` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `publicId` on the `TourFile` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `TourFile` table. All the data in the column will be lost.
  - Added the required column `imageKey` to the `HeroBanner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key` to the `TourFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HeroBanner" DROP COLUMN "image",
DROP COLUMN "imagePublicId",
ADD COLUMN     "imageKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Region" DROP COLUMN "ogImage",
DROP COLUMN "ogImagePublicId",
DROP COLUMN "thumbnail",
DROP COLUMN "thumbnailPublicId",
ADD COLUMN     "ogImageKey" TEXT,
ADD COLUMN     "thumbnailKey" TEXT;

-- AlterTable
ALTER TABLE "SubRegion" DROP COLUMN "ogImage",
DROP COLUMN "ogImagePublicId",
DROP COLUMN "thumbnail",
DROP COLUMN "thumbnailPublicId",
ADD COLUMN     "ogImageKey" TEXT,
ADD COLUMN     "thumbnailKey" TEXT;

-- AlterTable
ALTER TABLE "Tour" DROP COLUMN "ogImage",
DROP COLUMN "ogImagePublicId",
DROP COLUMN "thumbnail",
DROP COLUMN "thumbnailPublicId",
ADD COLUMN     "ogImageKey" TEXT,
ADD COLUMN     "thumbnailKey" TEXT;

-- AlterTable
ALTER TABLE "TourFile" DROP COLUMN "publicId",
DROP COLUMN "url",
ADD COLUMN     "key" TEXT NOT NULL;
