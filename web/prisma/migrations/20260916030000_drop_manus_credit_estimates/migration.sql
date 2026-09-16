-- Manus per-task credit usage is now read from the API (task.detail); the
-- per-profile estimate settings are no longer used.
ALTER TABLE "SiteSetting" DROP COLUMN "aiManusCreditsLite",
DROP COLUMN "aiManusCreditsMax",
DROP COLUMN "aiManusCreditsStandard";
