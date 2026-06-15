/**
 * Link que o aluno compartilha.
 *
 * Decisão de implementação (@dev, 2026-06-15): o link compartilhado aponta
 * direto pra página pública de checkout (`MGM_CHECKOUT_URL` — hoje
 * `/dobro-pass`), já com `ref` + utm + coupon embutidos. Assim o aluno divulga
 * a URL real (devemdobro.com) em vez do redirect interno `/i/<code>`.
 *
 * Trade-off: pular o `/i/<code>` significa NÃO registrar `MgmClick` (P2). A
 * atribuição passa a depender só do P1 (`utm_content` preservado pela Hubla até
 * o webhook), que já está cabeado na página /dobro-pass. Se `MGM_CHECKOUT_URL`
 * não estiver setado, cai no fallback `/i/<code>` (mantém P1+P2 via redirect).
 */
function getAppBase(): string {
    const base =
        process.env.MGM_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
        'http://localhost:3000';
    return base.replace(/\/+$/, '');
}

/** Fallback: redirect interno que registra clique (P2) e propaga params (P1). */
function buildTrackingLink(code: string): string {
    return `${getAppBase()}/i/${encodeURIComponent(code)}`;
}

export function buildShareLink(code: string): string {
    const base = process.env.MGM_CHECKOUT_URL;
    if (!base) {
        return buildTrackingLink(code);
    }

    try {
        const url = new URL(base);
        url.searchParams.set('ref', code);
        // utm equivalentes — cobrem P1 se a Hubla preservar qualquer um deles.
        url.searchParams.set('utm_source', 'mgm');
        url.searchParams.set('utm_medium', 'referral');
        url.searchParams.set('utm_content', code);
        // Cupom fixo de campanha (desconto do indicado). Default INDIQUEMGM;
        // `MGM_CHECKOUT_COUPON` sobrescreve (string vazia desliga).
        const coupon = (process.env.MGM_CHECKOUT_COUPON ?? 'INDIQUEMGM').trim();
        if (coupon) {
            url.searchParams.set('coupon', coupon);
        }
        return url.toString();
    } catch {
        // MGM_CHECKOUT_URL inválido — não quebra a tela, usa o link de tracking.
        return buildTrackingLink(code);
    }
}
