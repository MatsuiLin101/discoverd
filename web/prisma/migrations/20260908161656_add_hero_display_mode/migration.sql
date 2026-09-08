-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "heroDisplayMode" TEXT NOT NULL DEFAULT 'original',
ADD COLUMN     "heroMaxHeight" INTEGER NOT NULL DEFAULT 720;
