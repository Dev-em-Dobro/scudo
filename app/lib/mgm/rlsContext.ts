/**
 * Contextos RLS de serviço pro MGM (sem sessão de usuário).
 * Espelha o padrão de `app/lib/jobs/ingestionRls.ts` (`system:jobs-ingestion`).
 *
 * As policies da migration hand-authored liberam escrita/atualização nas
 * tabelas MGM apenas quando `current_setting('app.user_id')` casa com um
 * destes valores. Reads da página usam o `userId` da sessão (owner policy).
 */
export const MGM_WEBHOOK_RLS_USER_ID = 'system:mgm-webhook';
export const MGM_CRON_RLS_USER_ID = 'system:mgm-cron';
export const MGM_TRACKING_RLS_USER_ID = 'system:mgm-tracking';
export const MGM_ADMIN_RLS_USER_ID = 'system:mgm-admin'; // v0.4: seed do catálogo + admin de resgates
export const MGM_RANKING_RLS_USER_ID = 'system:mgm-ranking'; // v0.4: agregação cross-user pro leaderboard
