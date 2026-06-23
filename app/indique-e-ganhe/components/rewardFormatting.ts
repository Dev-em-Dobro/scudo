import type { MgmRewardType } from '@prisma/client';

/**
 * Formatação de prêmios (spec v0.4 §v0.4-D).
 * Ícone Material Symbols por família (Fase 1 sem imagens — decisão G).
 * Preço da renovação vem de `MGM_RENEWAL_PRICE_CENTS` (R$ 1.297 = 129700).
 */

export function iconForFamily(family: string): string {
    switch (family) {
        case 'merch-camiseta':
        case 'merch-camiseta-copa':
            return 'checkroom';
        case 'merch-livro':
            return 'menu_book';
        case 'renovacao':
            return 'autorenew';
        case 'temporada-copa-2026':
            return 'payments';
        default:
            return 'card_giftcard';
    }
}

function getRenewalPriceCents(): number | null {
    const raw = Number(process.env.MGM_RENEWAL_PRICE_CENTS);
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : null;
}

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    });
}

export interface RenewalDiscountText {
    /** "30% off" se sem preço base; "30% off — De R$ 1.297 por R$ 907,90" com preço. */
    headline: string;
    /** Linha curta sem âncora de preço, pra cards pequenos. */
    short: string;
    /** Preço cheio formatado (null se env não setada). */
    fromText: string | null;
    /** Preço com desconto aplicado (null se env não setada). */
    toText: string | null;
}

/**
 * Renderiza copy de prêmio de renovação. Lê `discountPercent` da metadata
 * ou `durationMonths` (1 ano grátis = 100% off).
 */
export function formatRenewalReward(
    type: MgmRewardType,
    metadata: unknown,
): RenewalDiscountText {
    const meta = (metadata as { discountPercent?: number; durationMonths?: number } | null) ?? {};
    const renewalCents = getRenewalPriceCents();
    const renewal = renewalCents != null ? renewalCents / 100 : null;

    if (type === 'DIGITAL_VOUCHER') {
        const months = meta.durationMonths ?? 12;
        const label = months === 12 ? '1 ano grátis na renovação' : `${months} meses grátis`;
        if (renewal != null) {
            return {
                headline: `${label} — Economia de ${formatBRL(renewal * (months / 12))}`,
                short: label,
                fromText: formatBRL(renewal),
                toText: formatBRL(0),
            };
        }
        return { headline: label, short: label, fromText: null, toText: null };
    }

    // DIGITAL_DISCOUNT
    const percent = meta.discountPercent ?? 0;
    const short = `${percent}% off na renovação`;

    if (renewal != null) {
        const discounted = renewal * (1 - percent / 100);
        return {
            headline: `${percent}% off — De ${formatBRL(renewal)} por ${formatBRL(discounted)}`,
            short,
            fromText: formatBRL(renewal),
            toText: formatBRL(discounted),
        };
    }

    return { headline: short, short, fromText: null, toText: null };
}
