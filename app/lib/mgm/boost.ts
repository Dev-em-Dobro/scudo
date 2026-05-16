/**
 * Boost de pontos da janela LI-26 (spec §6).
 * Pontuação base e multiplicador centralizados aqui — webhook e UI importam daqui.
 */

const DEFAULT_POINTS_BASE = 40;
const DEFAULT_BOOST_MULTIPLIER = 3.0;

export function getPointsBase(): number {
    const raw = Number(process.env.MGM_POINTS_BASE);
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : DEFAULT_POINTS_BASE;
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
