-- CreateEnum
CREATE TYPE "AiUsageStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "aiGeminiInputPricePerM" DOUBLE PRECISION,
ADD COLUMN     "aiGeminiOutputPricePerM" DOUBLE PRECISION,
ADD COLUMN     "aiManusPricePerCredit" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userAccount" TEXT NOT NULL,
    "tourId" TEXT,
    "tourName" TEXT NOT NULL,
    "kind" "AiGenerationKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "status" "AiUsageStatus" NOT NULL DEFAULT 'PENDING',
    "hint" TEXT,
    "promptOverridden" BOOLEAN NOT NULL DEFAULT false,
    "promptText" TEXT,
    "pdfCount" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "thoughtsTokens" INTEGER,
    "totalTokens" INTEGER,
    "taskId" TEXT,
    "agentProfile" TEXT,
    "creditsUsed" INTEGER,
    "latencyMs" INTEGER,
    "resultRef" TEXT,
    "outputChars" INTEGER,
    "error" TEXT,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_userId_idx" ON "AiUsageLog"("userId");

-- CreateIndex
CREATE INDEX "AiUsageLog_kind_idx" ON "AiUsageLog"("kind");

-- CreateIndex
CREATE INDEX "AiUsageLog_taskId_idx" ON "AiUsageLog"("taskId");

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
