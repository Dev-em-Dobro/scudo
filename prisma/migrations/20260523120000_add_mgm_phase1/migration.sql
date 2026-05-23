-- MGM Fase 1 (spec v0.4 §v0.4-D/E/H) — catálogo + resgate + multi-gateway.
-- Migration HAND-AUTHORED (spec v0.3 §C-A continua válido: default privileges
-- foram revogados em `harden_app_user_auth_privileges_phase1` — toda tabela
-- nova precisa de GRANT explícito + ENABLE RLS + policies pro role `app_user`).
-- Idempotente (DROP POLICY IF EXISTS).

-- ─────────────────────────────────────────────────────────────
-- 1) Enums novos
-- ─────────────────────────────────────────────────────────────

CREATE TYPE "PaymentGateway" AS ENUM ('hubla', 'asaas', 'stripe', 'other');

CREATE TYPE "MgmRewardType" AS ENUM ('PHYSICAL', 'DIGITAL_DISCOUNT', 'DIGITAL_VOUCHER');

CREATE TYPE "MgmRedemptionStatus" AS ENUM ('requested', 'approved', 'delivered', 'rejected', 'cancelled');

-- ─────────────────────────────────────────────────────────────
-- 2) AlterTable: User + UserProfile (campos Fase 1)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN "mgmRankingOptIn" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "UserProfile" ADD COLUMN "mgmShippingAddress" JSONB;

-- ─────────────────────────────────────────────────────────────
-- 3) AlterTable MgmReferral: multi-gateway
--    - adiciona `gateway` (default 'hubla' — backfill automático)
--    - RENAME hublaOrderId → gatewayOrderId (preserva dados; bandeira OFF em prod
--      mas mantém qualquer dado de staging/local)
--    - troca unique simples por composto (gateway, gatewayOrderId)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "MgmReferral" ADD COLUMN "gateway" "PaymentGateway" NOT NULL DEFAULT 'hubla';

ALTER TABLE "MgmReferral" RENAME COLUMN "hublaOrderId" TO "gatewayOrderId";

DROP INDEX IF EXISTS "MgmReferral_hublaOrderId_key";

CREATE UNIQUE INDEX "MgmReferral_gateway_gatewayOrderId_key"
    ON "MgmReferral"("gateway", "gatewayOrderId");

-- ─────────────────────────────────────────────────────────────
-- 4) CreateTable: MgmReward (catálogo de prêmios)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "MgmReward" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "costPoints" INTEGER NOT NULL,
    "type" "MgmRewardType" NOT NULL,
    "rewardFamily" TEXT NOT NULL,
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MgmReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MgmReward_slug_key" ON "MgmReward"("slug");
CREATE INDEX "MgmReward_active_sortOrder_idx" ON "MgmReward"("active", "sortOrder");
CREATE INDEX "MgmReward_rewardFamily_idx" ON "MgmReward"("rewardFamily");

-- ─────────────────────────────────────────────────────────────
-- 5) CreateTable: MgmRedemption (pedidos de resgate)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "MgmRedemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "rewardFamily" TEXT NOT NULL,
    "costSnapshot" INTEGER NOT NULL,
    "status" "MgmRedemptionStatus" NOT NULL DEFAULT 'requested',
    "shippingInfo" JSONB,
    "deliveryInfo" JSONB,
    "rejectedReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MgmRedemption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MgmRedemption_userId_status_idx" ON "MgmRedemption"("userId", "status");
CREATE INDEX "MgmRedemption_userId_rewardFamily_status_idx"
    ON "MgmRedemption"("userId", "rewardFamily", "status");
CREATE INDEX "MgmRedemption_status_requestedAt_idx"
    ON "MgmRedemption"("status", "requestedAt");

ALTER TABLE "MgmRedemption" ADD CONSTRAINT "MgmRedemption_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MgmRedemption" ADD CONSTRAINT "MgmRedemption_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "MgmReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 6) RLS / GRANT (OBRIGATÓRIO — ver spec v0.3 §C-A/§C-B)
-- ─────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "MgmReward" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "MgmRedemption" TO app_user;

ALTER TABLE "MgmReward" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MgmRedemption" ENABLE ROW LEVEL SECURITY;

-- MgmReward: leitura pública pra qualquer sessão autenticada (app.user_id setado).
-- Vitrine aparece pro aluno; descoberta de catálogo via service também (admin/seed).
DROP POLICY IF EXISTS mgmreward_authenticated_read ON "MgmReward";
CREATE POLICY mgmreward_authenticated_read
ON "MgmReward"
FOR SELECT
TO app_user
USING (current_setting('app.user_id', true) <> '');

-- MgmReward: escrita só pelo contexto admin (seed/CRUD admin).
DROP POLICY IF EXISTS mgmreward_admin_write ON "MgmReward";
CREATE POLICY mgmreward_admin_write
ON "MgmReward"
FOR ALL
TO app_user
USING (current_setting('app.user_id', true) = 'system:mgm-admin')
WITH CHECK (current_setting('app.user_id', true) = 'system:mgm-admin');

-- MgmRedemption: leitura do dono (página, sessão do aluno).
DROP POLICY IF EXISTS mgmredemption_owner_read ON "MgmRedemption";
CREATE POLICY mgmredemption_owner_read
ON "MgmRedemption"
FOR SELECT
TO app_user
USING ("userId" = current_setting('app.user_id', true));

-- MgmRedemption: insert do dono (aluno cria próprio resgate).
DROP POLICY IF EXISTS mgmredemption_owner_insert ON "MgmRedemption";
CREATE POLICY mgmredemption_owner_insert
ON "MgmRedemption"
FOR INSERT
TO app_user
WITH CHECK ("userId" = current_setting('app.user_id', true));

-- MgmRedemption: update do dono — só pra cancelar resgate `requested`
-- (a app garante a regra de status; o RLS limita ao próprio dono).
DROP POLICY IF EXISTS mgmredemption_owner_cancel ON "MgmRedemption";
CREATE POLICY mgmredemption_owner_cancel
ON "MgmRedemption"
FOR UPDATE
TO app_user
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));

-- MgmRedemption: leitura/escrita do admin (fila, approve, deliver, reject).
DROP POLICY IF EXISTS mgmredemption_admin_all ON "MgmRedemption";
CREATE POLICY mgmredemption_admin_all
ON "MgmRedemption"
FOR ALL
TO app_user
USING (current_setting('app.user_id', true) = 'system:mgm-admin')
WITH CHECK (current_setting('app.user_id', true) = 'system:mgm-admin');

-- ─────────────────────────────────────────────────────────────
-- 7) Policy adicional na MgmReferral pro ranking (cross-user read)
--    A política owner_read da Fase 0 só deixa o aluno ver os PRÓPRIOS referrals.
--    Pra montar ranking público a gente precisa de SELECT cross-user — sob
--    contexto dedicado `system:mgm-ranking` (chamada pela página de Ranking).
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS mgmreferral_ranking_read ON "MgmReferral";
CREATE POLICY mgmreferral_ranking_read
ON "MgmReferral"
FOR SELECT
TO app_user
USING (current_setting('app.user_id', true) = 'system:mgm-ranking');
