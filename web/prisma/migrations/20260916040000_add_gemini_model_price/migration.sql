-- CreateTable
CREATE TABLE "GeminiModelPrice" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "inputPerM" DOUBLE PRECISION NOT NULL,
    "outputPerM" DOUBLE PRECISION NOT NULL,
    "inputSkuId" TEXT,
    "outputSkuId" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeminiModelPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeminiModelPrice_model_currency_key" ON "GeminiModelPrice"("model", "currency");
