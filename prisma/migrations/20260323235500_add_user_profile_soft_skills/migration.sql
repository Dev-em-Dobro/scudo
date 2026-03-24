-- AlterTable
ALTER TABLE "UserProfile"
ADD COLUMN "softSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
