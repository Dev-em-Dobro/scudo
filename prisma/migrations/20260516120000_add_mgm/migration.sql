-- MGM (Member-Get-Member) Fase 0 — spec v0.3 §C-A/§C-B.
-- Migration HAND-AUTHORED: a parte de DDL é o que `prisma migrate` geraria;
-- o bloco RLS/GRANT no fim é OBRIGATÓRIO (default privileges foram revogados
-- em `harden_app_user_auth_privileges_phase1` — sem GRANT explícito o runtime
-- `app_user` recebe permission denied nas tabelas novas).
-- Idempotente (DROP POLICY IF EXISTS) pra manter histórico alinhado ao Neon.

-- CreateEnum
CREATE TYPE "MgmReferralStatus" AS ENUM ('pending', 'valid', 'invalid', 'reverted');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "mgmReferralCode" TEXT;

-- CreateTable
CREATE TABLE "MgmReferral" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referralCodeUsed" TEXT NOT NULL,
    "referredEmail" TEXT NOT NULL,
    "referredPhone" TEXT,
    "referredName" TEXT,
    "saleAmount" DECIMAL(10,2) NOT NULL,
    "hublaOrderId" TEXT NOT NULL,
    "pointsBase" INTEGER NOT NULL,
    "pointsMultiplier" DECIMAL(3,1) NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "status" "MgmReferralStatus" NOT NULL DEFAULT 'pending',
    "invalidReason" TEXT,
    "guaranteeUntil" TIMESTAMP(3) NOT NULL,
    "signedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MgmReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MgmClick" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referredEmail" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MgmClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mgmReferralCode_key" ON "User"("mgmReferralCode");

-- CreateIndex
CREATE UNIQUE INDEX "MgmReferral_hublaOrderId_key" ON "MgmReferral"("hublaOrderId");

-- CreateIndex
CREATE INDEX "MgmReferral_referrerUserId_status_idx" ON "MgmReferral"("referrerUserId", "status");

-- CreateIndex
CREATE INDEX "MgmReferral_referredEmail_idx" ON "MgmReferral"("referredEmail");

-- CreateIndex
CREATE INDEX "MgmReferral_referralCodeUsed_idx" ON "MgmReferral"("referralCodeUsed");

-- CreateIndex
CREATE INDEX "MgmClick_referralCode_idx" ON "MgmClick"("referralCode");

-- CreateIndex
CREATE INDEX "MgmClick_referredEmail_idx" ON "MgmClick"("referredEmail");

-- CreateIndex
CREATE INDEX "MgmClick_createdAt_idx" ON "MgmClick"("createdAt");

-- AddForeignKey
ALTER TABLE "MgmReferral" ADD CONSTRAINT "MgmReferral_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- RLS / GRANT (OBRIGATÓRIO — ver spec v0.3 §C-A/§C-B)
-- ─────────────────────────────────────────────────────────────

-- Default privileges foram revogados: GRANT explícito pro role de runtime.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "MgmReferral" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "MgmClick" TO app_user;

ALTER TABLE "MgmReferral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MgmClick" ENABLE ROW LEVEL SECURITY;

-- MgmReferral: leitura do dono (página, sessão do indicador).
DROP POLICY IF EXISTS mgmreferral_owner_read ON "MgmReferral";
CREATE POLICY mgmreferral_owner_read
ON "MgmReferral"
FOR SELECT
TO app_user
USING ("referrerUserId" = current_setting('app.user_id', true));

-- MgmReferral: leitura de serviço (webhook idempotência/duplicidade, cron).
DROP POLICY IF EXISTS mgmreferral_service_read ON "MgmReferral";
CREATE POLICY mgmreferral_service_read
ON "MgmReferral"
FOR SELECT
TO app_user
USING (current_setting('app.user_id', true) IN ('system:mgm-webhook', 'system:mgm-cron'));

-- MgmReferral: insert de serviço (webhook).
DROP POLICY IF EXISTS mgmreferral_service_insert ON "MgmReferral";
CREATE POLICY mgmreferral_service_insert
ON "MgmReferral"
FOR INSERT
TO app_user
WITH CHECK (current_setting('app.user_id', true) = 'system:mgm-webhook');

-- MgmReferral: update de serviço (webhook refund + cron pending→valid).
DROP POLICY IF EXISTS mgmreferral_service_update ON "MgmReferral";
CREATE POLICY mgmreferral_service_update
ON "MgmReferral"
FOR UPDATE
TO app_user
USING (current_setting('app.user_id', true) IN ('system:mgm-webhook', 'system:mgm-cron'))
WITH CHECK (current_setting('app.user_id', true) IN ('system:mgm-webhook', 'system:mgm-cron'));

-- MgmClick: contexto de serviço (tracking escreve, webhook lê pra P2).
DROP POLICY IF EXISTS mgmclick_service_all ON "MgmClick";
CREATE POLICY mgmclick_service_all
ON "MgmClick"
FOR ALL
TO app_user
USING (current_setting('app.user_id', true) IN ('system:mgm-tracking', 'system:mgm-webhook', 'system:mgm-cron'))
WITH CHECK (current_setting('app.user_id', true) IN ('system:mgm-tracking', 'system:mgm-webhook', 'system:mgm-cron'));
