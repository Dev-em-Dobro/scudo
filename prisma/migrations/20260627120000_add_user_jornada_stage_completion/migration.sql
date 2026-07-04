-- Snapshot de conclusão por etapa — impede regressão de rank quando entram aulas novas.

CREATE TABLE "UserJornadaStageCompletion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "catalogVersionAtCompletion" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserJornadaStageCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserJornadaStageCompletion_userId_stageId_key"
  ON "UserJornadaStageCompletion"("userId", "stageId");

CREATE INDEX "UserJornadaStageCompletion_userId_idx"
  ON "UserJornadaStageCompletion"("userId");

ALTER TABLE "UserJornadaStageCompletion"
  ADD CONSTRAINT "UserJornadaStageCompletion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserJornadaStageCompletion" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "UserJornadaStageCompletion" TO app_user;

DROP POLICY IF EXISTS userjornada_stage_completion_owner_policy ON "UserJornadaStageCompletion";

CREATE POLICY userjornada_stage_completion_owner_policy
ON "UserJornadaStageCompletion"
FOR ALL
TO app_user
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));
