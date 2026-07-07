-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogResource" ADD VALUE 'SALES_REGION';
ALTER TYPE "LogResource" ADD VALUE 'SALES_AGENT';

-- CreateTable
CREATE TABLE "SalesRegion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesAgent" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "cardKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filename" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesRegion_name_key" ON "SalesRegion"("name");

-- AddForeignKey
ALTER TABLE "SalesAgent" ADD CONSTRAINT "SalesAgent_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "SalesRegion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
