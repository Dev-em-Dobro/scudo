-- Phase 1 hardening for Better Auth related access
-- Keep auth tables without RLS for now (compatibility), but reduce broad privileges.

-- Remove broad automatic grants for future tables.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM app_user;

-- Remove runtime access to Prisma migration history table.
REVOKE ALL PRIVILEGES ON TABLE "_prisma_migrations" FROM app_user;

-- Runtime app should not write ingestion logs directly.
REVOKE ALL PRIVILEGES ON TABLE "JobIngestionLog" FROM app_user;

-- Explicit grants for auth/core runtime tables used by Better Auth.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "User" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Account" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Session" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Verification" TO app_user;

-- Explicit grants for app domain tables with RLS policies already in place.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "UserProfile" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "UserProject" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "UserOnboardingProgress" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "UserJornadaTaskProgress" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ProductFeedback" TO app_user;

-- Jobs need read/write for internal ingestion webhook and jobs bootstrap flows.
GRANT SELECT, INSERT, UPDATE ON TABLE "Job" TO app_user;
REVOKE DELETE ON TABLE "Job" FROM app_user;
