-- Snapshot cost columns for AI usage rows.
ALTER TABLE "AiUsageLog" ADD COLUMN "costUsd" DOUBLE PRECISION,
ADD COLUMN "costTwd" DOUBLE PRECISION;
