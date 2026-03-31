-- AlterTable
ALTER TABLE "User"
ADD COLUMN "curseducaMemberId" INTEGER,
ADD COLUMN "curseducaMemberSlug" TEXT,
ADD COLUMN "curseducaMemberUuid" TEXT,
ADD COLUMN "curseducaSyncNeedsRetry" BOOLEAN NOT NULL DEFAULT false;
