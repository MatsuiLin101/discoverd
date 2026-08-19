-- CreateEnum
CREATE TYPE "ImportModule" AS ENUM ('TAG', 'REGION', 'TOUR');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'COMMITTED');

-- AlterEnum
ALTER TYPE "LogResource" ADD VALUE 'IMPORT';

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "SubRegion" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "productId" TEXT;

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "module" "ImportModule" NOT NULL,
    "filename" TEXT NOT NULL,
    "md5" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SubRegion_regionId_code_key" ON "SubRegion"("regionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_productId_key" ON "Tour"("productId");

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

