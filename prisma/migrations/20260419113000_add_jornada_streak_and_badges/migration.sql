-- CreateTable
CREATE TABLE "UserStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
    "longestStreakDays" INTEGER NOT NULL DEFAULT 0,
    "streakPoints" INTEGER NOT NULL DEFAULT 0,
    "lastQualifiedDay" TEXT,
    "lastTaskCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStreakDailyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreakDailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakBadge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "requiredDays" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreakBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStreakBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreakBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStreak_userId_key" ON "UserStreak"("userId");

-- CreateIndex
CREATE INDEX "UserStreak_userId_idx" ON "UserStreak"("userId");

-- CreateIndex
CREATE INDEX "UserStreak_currentStreakDays_idx" ON "UserStreak"("currentStreakDays");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreakDailyActivity_userId_dayKey_key" ON "UserStreakDailyActivity"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "UserStreakDailyActivity_userId_idx" ON "UserStreakDailyActivity"("userId");

-- CreateIndex
CREATE INDEX "UserStreakDailyActivity_dayKey_idx" ON "UserStreakDailyActivity"("dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "StreakBadge_slug_key" ON "StreakBadge"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StreakBadge_requiredDays_key" ON "StreakBadge"("requiredDays");

-- CreateIndex
CREATE INDEX "StreakBadge_sortOrder_idx" ON "StreakBadge"("sortOrder");

-- CreateIndex
CREATE INDEX "StreakBadge_isActive_idx" ON "StreakBadge"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreakBadge_userId_badgeId_key" ON "UserStreakBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "UserStreakBadge_userId_idx" ON "UserStreakBadge"("userId");

-- CreateIndex
CREATE INDEX "UserStreakBadge_badgeId_idx" ON "UserStreakBadge"("badgeId");

-- CreateIndex
CREATE INDEX "UserStreakBadge_awardedAt_idx" ON "UserStreakBadge"("awardedAt");

-- AddForeignKey
ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStreakDailyActivity" ADD CONSTRAINT "UserStreakDailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStreakBadge" ADD CONSTRAINT "UserStreakBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStreakBadge" ADD CONSTRAINT "UserStreakBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "StreakBadge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default streak badges (data-driven and editable in DB)
INSERT INTO "StreakBadge" (
    "id",
    "slug",
    "name",
    "description",
    "icon",
    "requiredDays",
    "sortOrder",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES
    ('streak-7', 'streak-7', 'Ritmo Inicial', 'Manteve 7 dias seguidos de consistencia na jornada.', 'local_fire_department', 7, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('streak-30', 'streak-30', 'Constancia de Ferro', 'Completou 30 dias seguidos concluindo ao menos uma tarefa por dia.', 'workspace_premium', 30, 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('streak-60', 'streak-60', 'Foco Inabalavel', 'Sustentou 60 dias seguidos de evolucao diaria na plataforma.', 'verified', 60, 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('streak-100', 'streak-100', 'Lenda da Scudo', 'Alcancou 100 dias seguidos e virou referencia de disciplina.', 'crown', 100, 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- RLS hardening for streak tables
ALTER TABLE "UserStreak" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserStreakDailyActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserStreakBadge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StreakBadge" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS userstreak_owner_policy ON "UserStreak";
CREATE POLICY userstreak_owner_policy
ON "UserStreak"
FOR ALL
TO app_user
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));

DROP POLICY IF EXISTS userstreakdaily_owner_policy ON "UserStreakDailyActivity";
CREATE POLICY userstreakdaily_owner_policy
ON "UserStreakDailyActivity"
FOR ALL
TO app_user
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));

DROP POLICY IF EXISTS userstreakbadge_owner_policy ON "UserStreakBadge";
CREATE POLICY userstreakbadge_owner_policy
ON "UserStreakBadge"
FOR ALL
TO app_user
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));

DROP POLICY IF EXISTS streakbadge_read_policy ON "StreakBadge";
CREATE POLICY streakbadge_read_policy
ON "StreakBadge"
FOR SELECT
TO app_user
USING (true);

-- Explicit grants for app runtime role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "UserStreak" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "UserStreakDailyActivity" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "UserStreakBadge" TO app_user;
GRANT SELECT ON TABLE "StreakBadge" TO app_user;
REVOKE INSERT, UPDATE, DELETE ON TABLE "StreakBadge" FROM app_user;
