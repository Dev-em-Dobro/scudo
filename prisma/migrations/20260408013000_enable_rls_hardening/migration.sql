-- RLS hardening for user-scoped tables and public read jobs
-- Idempotent migration to keep Prisma history aligned with Neon state.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOBYPASSRLS NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserOnboardingProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserJornadaTaskProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductFeedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS userprofile_owner_policy ON "UserProfile";
CREATE POLICY userprofile_owner_policy
ON "UserProfile"
FOR ALL
TO app_user
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));

DROP POLICY IF EXISTS useronboarding_owner_policy ON "UserOnboardingProgress";
CREATE POLICY useronboarding_owner_policy
ON "UserOnboardingProgress"
FOR ALL
TO app_user
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));

DROP POLICY IF EXISTS userjornada_owner_policy ON "UserJornadaTaskProgress";
CREATE POLICY userjornada_owner_policy
ON "UserJornadaTaskProgress"
FOR ALL
TO app_user
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));

DROP POLICY IF EXISTS productfeedback_owner_policy ON "ProductFeedback";
CREATE POLICY productfeedback_owner_policy
ON "ProductFeedback"
FOR ALL
TO app_user
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));

DROP POLICY IF EXISTS userproject_owner_policy ON "UserProject";
CREATE POLICY userproject_owner_policy
ON "UserProject"
FOR ALL
TO app_user
USING (
  EXISTS (
    SELECT 1
    FROM "UserProfile" up
    WHERE up."id" = "UserProject"."userProfileId"
      AND up."userId" = current_setting('app.user_id', true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "UserProfile" up
    WHERE up."id" = "UserProject"."userProfileId"
      AND up."userId" = current_setting('app.user_id', true)
  )
);

DROP POLICY IF EXISTS job_read_policy ON "Job";
CREATE POLICY job_read_policy
ON "Job"
FOR SELECT
TO app_user
USING (true);
