-- Allow controlled write access to Job table under a service RLS context.
-- This keeps public read policy unchanged while enabling internal ingestion flows.

DROP POLICY IF EXISTS job_write_service_insert_policy ON "Job";
CREATE POLICY job_write_service_insert_policy
ON "Job"
FOR INSERT
TO app_user
WITH CHECK (current_setting('app.user_id', true) = 'system:jobs-ingestion');

DROP POLICY IF EXISTS job_write_service_update_policy ON "Job";
CREATE POLICY job_write_service_update_policy
ON "Job"
FOR UPDATE
TO app_user
USING (current_setting('app.user_id', true) = 'system:jobs-ingestion')
WITH CHECK (current_setting('app.user_id', true) = 'system:jobs-ingestion');
