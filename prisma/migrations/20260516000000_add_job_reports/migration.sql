-- Add report queue for job availability moderation.

CREATE TYPE "JobReportReason" AS ENUM ('EXPIRED', 'UNAVAILABLE', 'CANCELLED');
CREATE TYPE "JobReportStatus" AS ENUM ('PENDING', 'INACTIVATED', 'REVIEWED');

CREATE TABLE "JobReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reason" "JobReportReason" NOT NULL,
    "status" "JobReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewAfterAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "inactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobReport_jobId_status_reviewAfterAt_idx" ON "JobReport"("jobId", "status", "reviewAfterAt");
CREATE INDEX "JobReport_userId_createdAt_idx" ON "JobReport"("userId", "createdAt");

ALTER TABLE "JobReport"
    ADD CONSTRAINT "JobReport_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobReport"
    ADD CONSTRAINT "JobReport_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobReport" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "JobReport" TO app_user;

DROP POLICY IF EXISTS jobreport_owner_policy ON "JobReport";
CREATE POLICY jobreport_owner_policy
ON "JobReport"
FOR ALL
TO app_user
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));

DROP POLICY IF EXISTS jobreport_service_select_policy ON "JobReport";
CREATE POLICY jobreport_service_select_policy
ON "JobReport"
FOR SELECT
TO app_user
USING (current_setting('app.user_id', true) = 'system:jobs-ingestion');

DROP POLICY IF EXISTS jobreport_service_update_policy ON "JobReport";
CREATE POLICY jobreport_service_update_policy
ON "JobReport"
FOR UPDATE
TO app_user
USING (current_setting('app.user_id', true) = 'system:jobs-ingestion')
WITH CHECK (current_setting('app.user_id', true) = 'system:jobs-ingestion');