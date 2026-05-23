/**
 * Temporadas MGM (spec v0.4 §v0.4-A/B). Substitui o conceito "LI-26".
 *
 * Modelo simples via env (sem tabela `MgmSeason`): qualquer pessoa com acesso
 * à Vercel altera `MGM_BOOST_*` + `MGM_SEASON_NAME` pra abrir uma temporada.
 * Pontuação base e multiplicador centralizados aqui — webhook, UI, ranking
 * e FAQ importam daqui.
 *
 * NB: este módulo era `boost.ts` na Fase 0. Renomeado pra `seasons.ts` em
 * v0.4 pra refletir que "LI-26" virou "Temporada" em toda copy.
 */

const DEFAULT_POINTS_BASE = 100;
const DEFAULT_BOOST_MULTIPLIER = 2.0; // v0.4-B: era 3.0 na Fase 0
const DEFAULT_GUARANTEE_DAYS = 15;

export function getPointsBase(): number {
    const raw = Number(process.env.MGM_POINTS_BASE);
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : DEFAULT_POINTS_BASE;
}

/**
 * Período de garantia (dias). Indicação fica `pending` até passar; reembolso
 * dentro disso invalida o ponto. Garantia DevQuest = 15 dias. Fonte única —
 * webhook, cron, UI e FAQ leem daqui.
 */
export function getGuaranteeDays(): number {
    const raw = Number(process.env.MGM_GUARANTEE_DAYS);
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : DEFAULT_GUARANTEE_DAYS;
}

/**
 * Existe temporada ativa agora? (boost de pontos rolando).
 * Era `isBoostActive()` na Fase 0 — alias mantido pra compat.
 */
export function isSeasonActive(now: Date = new Date()): boolean {
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

/** Alias legado pra Fase 0 — manter até refactor completo dos imports. */
export const isBoostActive = isSeasonActive;

export function getPointsMultiplier(now: Date = new Date()): number {
    if (!isSeasonActive(now)) {
        return 1.0;
    }

    const raw = Number(process.env.MGM_BOOST_MULTIPLIER);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BOOST_MULTIPLIER;
}

/**
 * Nome da temporada ativa (exibido na UI quando boost ativo).
 * Retorna null fora de temporada ou se env não setada.
 */
export function getSeasonName(): string | null {
    if (!isSeasonActive()) {
        return null;
    }
    const name = process.env.MGM_SEASON_NAME?.trim();
    return name && name.length > 0 ? name : null;
}

export interface SeasonWindow {
    active: boolean;
    name: string | null;
    multiplier: number;
    startsAt: Date | null;
    endsAt: Date | null;
}

/** Snapshot completo da temporada — pra UI/ranking que precisa do range de datas. */
export function getCurrentSeason(now: Date = new Date()): SeasonWindow {
    const active = isSeasonActive(now);
    const start = process.env.MGM_BOOST_STARTS_AT;
    const end = process.env.MGM_BOOST_ENDS_AT;
    const startsAt = start ? new Date(start) : null;
    const endsAt = end ? new Date(end) : null;
    return {
        active,
        name: active ? getSeasonName() : null,
        multiplier: getPointsMultiplier(now),
        startsAt: startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt : null,
        endsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null,
    };
}
