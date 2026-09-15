-- AlterTable
ALTER TABLE "SiteSetting" ALTER COLUMN "boxMaxWidth" SET DEFAULT 1280;

-- Migrate rows still on the old default (1320) to the new default.
UPDATE "SiteSetting" SET "boxMaxWidth" = 1280 WHERE "boxMaxWidth" = 1320;
