-- Catálogo versionado da jornada (Opção 2 — espelho Curseduca + reconciliação no Scudo)

CREATE TYPE "JornadaCatalogTaskKind" AS ENUM (
  'aula',
  'projeto',
  'desafio',
  'conceito',
  'pratica',
  'entrega',
  'extra'
);

CREATE TABLE "JornadaCatalogTask" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "kind" "JornadaCatalogTaskKind",
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deprecatedAt" TIMESTAMP(3),
  "catalogVersion" INTEGER NOT NULL DEFAULT 1,
  "externalLessonId" INTEGER,
  "codeQuestExerciseId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JornadaCatalogTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JornadaCatalogTask_taskId_key" ON "JornadaCatalogTask"("taskId");
CREATE UNIQUE INDEX "JornadaCatalogTask_externalLessonId_key" ON "JornadaCatalogTask"("externalLessonId");
CREATE INDEX "JornadaCatalogTask_stageId_order_idx" ON "JornadaCatalogTask"("stageId", "order");
CREATE INDEX "JornadaCatalogTask_catalogVersion_idx" ON "JornadaCatalogTask"("catalogVersion");
CREATE INDEX "JornadaCatalogTask_isActive_idx" ON "JornadaCatalogTask"("isActive");

-- Catálogo é leitura para o runtime; escrita apenas via scripts/admin (URL de migração).
GRANT SELECT ON TABLE "JornadaCatalogTask" TO app_user;
