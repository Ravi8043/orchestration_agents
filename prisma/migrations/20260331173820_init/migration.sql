-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "ticker" VARCHAR(10) NOT NULL,
    "timeframe" VARCHAR(10) NOT NULL DEFAULT '30d',
    "includeSocial" BOOLEAN NOT NULL DEFAULT true,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "agentOutputs" JSONB,
    "consensusData" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "llmModel" VARCHAR(100) NOT NULL DEFAULT 'gpt-5-mini',
    "newsSourcesCount" INTEGER,
    "priceDataPoints" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "executionTimeSec" INTEGER,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisArchive" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualOutcome" TEXT,
    "actualPriceChange" DOUBLE PRECISION,

    CONSTRAINT "AnalysisArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalysisRun_ticker_createdAt_idx" ON "AnalysisRun"("ticker", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AnalysisRun_status_createdAt_idx" ON "AnalysisRun"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AnalysisArchive" ADD CONSTRAINT "AnalysisArchive_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
