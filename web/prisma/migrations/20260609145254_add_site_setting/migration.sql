-- AlterEnum
ALTER TYPE "LogResource" ADD VALUE 'SITE_SETTING';

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "lineUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);
