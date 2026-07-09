-- Currículo ATS gerado automaticamente pela Scudo ao concluir ranks.
ALTER TABLE "UserProfile"
ADD COLUMN "generatedResumeJson" JSONB,
ADD COLUMN "generatedResumePdf" BYTEA,
ADD COLUMN "generatedResumeUpdatedAt" TIMESTAMP(3),
ADD COLUMN "generatedResumeStageId" TEXT;

ALTER TABLE "UserProject"
ADD COLUMN "courseProjectKey" TEXT;

CREATE UNIQUE INDEX "UserProject_userProfileId_courseProjectKey_key"
ON "UserProject"("userProfileId", "courseProjectKey");
