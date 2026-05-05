ALTER TABLE "Job"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "inactivatedAt" TIMESTAMP(3),
ADD COLUMN "inactivationReason" TEXT;

CREATE INDEX "Job_isActive_lastSeenAt_idx" ON "Job"("isActive", "lastSeenAt");
