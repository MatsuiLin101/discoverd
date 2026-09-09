-- Rename the carousel-only display mode to a site-wide layout mode and add the
-- boxed-layout settings. RENAME preserves the existing value.
ALTER TABLE "SiteSetting" RENAME COLUMN "heroDisplayMode" TO "layoutMode";
ALTER TABLE "SiteSetting" ADD COLUMN "boxMaxWidth" INTEGER NOT NULL DEFAULT 1320;
ALTER TABLE "SiteSetting" ADD COLUMN "boxOuterBackground" TEXT NOT NULL DEFAULT 'neutral';
