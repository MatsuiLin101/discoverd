-- Backfill existing NULL displayName with username (username is unique, so no conflict)
UPDATE "User" SET "displayName" = "username" WHERE "displayName" IS NULL;

-- AlterTable: make displayName required
ALTER TABLE "User" ALTER COLUMN "displayName" SET NOT NULL;

-- CreateIndex: enforce uniqueness on displayName
CREATE UNIQUE INDEX "User_displayName_key" ON "User"("displayName");
