-- Rename User.email → User.username (login account, now accepts any string)
ALTER TABLE "User" RENAME COLUMN "email" TO "username";

-- Add optional display name and contact email fields to User
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
ALTER TABLE "User" ADD COLUMN "email" TEXT;

-- Rename ActivityLog.userEmail → ActivityLog.userAccount
ALTER TABLE "ActivityLog" RENAME COLUMN "userEmail" TO "userAccount";
