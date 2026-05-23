/**
 * Gate de admin do MGM (spec v0.4 §v0.4-I).
 *
 * Sem RBAC formal — só lista de e-mails na env `MGM_ADMIN_EMAILS` (CSV).
 * Suficiente pra Fase 1 (1-3 pessoas operando). Migrar pra papel formal
 * se a operação crescer.
 */

function parseAdmins(): Set<string> {
    const raw = process.env.MGM_ADMIN_EMAILS ?? '';
    return new Set(
        raw
            .split(',')
            .map((entry) => entry.trim().toLowerCase())
            .filter((entry) => entry.length > 0),
    );
}

export function isMgmAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    const admins = parseAdmins();
    return admins.has(email.toLowerCase());
}
