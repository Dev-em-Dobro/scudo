/**
 * Link que o aluno compartilha.
 *
 * Decisão de implementação (@dev, 2026-05-16) — alinhada ao plano de resiliência
 * da spec §4.7: o link compartilhado aponta pra rota INTERNA `/i/[code]`, não
 * direto pro checkout da Hubla. A rota intermediária registra `MgmClick` (P2) e
 * faz `redirect(302)` pro checkout com `?ref=` + utm (P1) — assim P1 e P2 ficam
 * ativos de graça, independente do que a Hubla preservar. `MGM_CHECKOUT_URL` é
 * lido na rota `/i/[code]`, não aqui (não bloqueia gerar/exibir o link).
 */
function getAppBase(): string {
    const base =
        process.env.MGM_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
        'http://localhost:3000';
    return base.replace(/\/+$/, '');
}

export function buildShareLink(code: string): string {
    return `${getAppBase()}/i/${encodeURIComponent(code)}`;
}
