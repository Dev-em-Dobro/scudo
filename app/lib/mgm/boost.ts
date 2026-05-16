/**
 * Boost de pontos da janela LI-26 (spec §6).
 * Pontuação base e multiplicador centralizados aqui — webhook e UI importam daqui.
 */

const DEFAULT_POINTS_BASE = 100;
const DEFAULT_BOOST_MULTIPLIER = 3.0;
const DEFAULT_GUARANTEE_DAYS = 15;

export function getPointsBase(): number {
    const raw = Number(process.env.MGM_POINTS_BASE);
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : DEFAULT_POINTS_BASE;
}

/**
 * Período de garantia (dias). Indicação fica `pending` até passar; reembolso
 * dentro disso invalida o ponto. Garantia DevQuest = 15 dias (decisão
 * stakeholder 2026-05-16; era 7d na v0.2 da spec). Fonte única — webhook,
 * cron, UI e FAQ leem daqui.
 */
export function getGuaranteeDays(): number {
    const raw = Number(process.env.MGM_GUARANTEE_DAYS);
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : DEFAULT_GUARANTEE_DAYS;
}

export function isBoostActive(now: Date = new Date()): boolean {
    const start = process.env.MGM_BOOST_STARTS_AT;
    const end = process.env.MGM_BOOST_ENDS_AT;
    if (!start || !end) {
        return false;
    }

    const startsAt = new Date(start);
    const endsAt = new Date(end);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        return false;
    }

    return now >= startsAt && now <= endsAt;
}

export function getPointsMultiplier(now: Date = new Date()): number {
    if (!isBoostActive(now)) {
        return 1.0;
    }

    const raw = Number(process.env.MGM_BOOST_MULTIPLIER);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BOOST_MULTIPLIER;
}
