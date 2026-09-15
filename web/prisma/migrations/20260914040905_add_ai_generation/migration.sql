-- CreateEnum
CREATE TYPE "AiGenerationKind" AS ENUM ('DESCRIPTION', 'THUMBNAIL');

-- CreateEnum
CREATE TYPE "AiGenerationStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogResource" ADD VALUE 'AI_SETTING';
ALTER TYPE "LogResource" ADD VALUE 'AI_GENERATION';

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "aiDescriptionModel" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
ADD COLUMN     "aiDescriptionPrompt" TEXT,
ADD COLUMN     "aiThumbnailPrompt" TEXT,
ADD COLUMN     "geminiApiKeyEnc" TEXT,
ADD COLUMN     "manusApiKeyEnc" TEXT;

-- CreateTable
CREATE TABLE "UserAiPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "descriptionModel" TEXT,
    "descriptionPrompt" TEXT,
    "thumbnailPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAiPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "kind" "AiGenerationKind" NOT NULL,
    "status" "AiGenerationStatus" NOT NULL DEFAULT 'READY',
    "text" TEXT,
    "imageKey" TEXT,
    "taskId" TEXT,
    "error" TEXT,
    "model" TEXT,
    "prompt" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAiPreference_userId_key" ON "UserAiPreference"("userId");

-- CreateIndex
CREATE INDEX "AiGeneration_tourId_kind_idx" ON "AiGeneration"("tourId", "kind");

-- AddForeignKey
ALTER TABLE "UserAiPreference" ADD CONSTRAINT "UserAiPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
