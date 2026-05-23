import { withRlsUserContext } from '@/app/lib/rls';
import { getCurrentSeason } from '@/app/lib/mgm/seasons';
import { MGM_RANKING_RLS_USER_ID } from '@/app/lib/mgm/rlsContext';

/**
 * Ranking público MGM (spec v0.4 §v0.4-G).
 *
 * Dois escopos:
 *  - `all-time`: soma `pointsEarned` (status valid+pending) de todos os tempos
 *  - `season`: filtra `signedUpAt` na janela `MGM_BOOST_STARTS_AT..ENDS_AT`
 *
 * Conta `valid + pending` (não só valid) — UX de engajamento durante a janela.
 * UI deixa explícito "X em apuração" pra setar expectativa.
 *
 * Privacidade: `User.mgmRankingOptIn = false` → exibido como "Indicador anônimo".
 *
 * Cache: 60s in-memory por escopo. Leaderboard tolera atraso pequeno; reduz
 * carga em queries de grupo. Cache é per-instância (serverless ok).
 */

export type RankingScope = 'all-time' | 'season';

export interface RankingEntry {
    rank: number;
    userId: string;
    displayName: string; // primeiro nome ou "Indicador anônimo"
    referralsCount: number; // # indicações valid+pending no escopo
    pointsTotal: number;
    isOptedOut: boolean; // pra UI: opt-out mostra placeholder
}

export interface RankingResult {
    scope: RankingScope;
    seasonName: string | null;
    entries: RankingEntry[];
    /** Posição do user logado (1-indexed); null se zero indicações no escopo. */
    viewerRank: number | null;
    viewerEntry: RankingEntry | null;
}

interface CacheEntry {
    fetchedAt: number;
    raw: Array<{
        referrerUserId: string;
        count: number;
        points: number;
    }>;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function firstNameOf(name: string): string {
    return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

function cacheKeyFor(scope: RankingScope, season: ReturnType<typeof getCurrentSeason>): string {
    if (scope === 'season') {
        return `season:${season.startsAt?.toISOString() ?? '-'}:${season.endsAt?.toISOString() ?? '-'}`;
    }
    return 'all-time';
}

async function fetchRaw(
    scope: RankingScope,
    season: ReturnType<typeof getCurrentSeason>,
): Promise<CacheEntry['raw']> {
    return withRlsUserContext(MGM_RANKING_RLS_USER_ID, async (tx) => {
        const dateFilter =
            scope === 'season' && season.startsAt && season.endsAt
                ? { signedUpAt: { gte: season.startsAt, lte: season.endsAt } }
                : {};

        const grouped = await tx.mgmReferral.groupBy({
            by: ['referrerUserId'],
            where: {
                status: { in: ['valid', 'pending'] },
                ...dateFilter,
            },
            _count: { _all: true },
            _sum: { pointsEarned: true },
        });

        return grouped.map((row) => ({
            referrerUserId: row.referrerUserId,
            count: row._count._all,
            points: row._sum.pointsEarned ?? 0,
        }));
    });
}

export async function getRanking(
    viewerUserId: string | null,
    opts: { scope: RankingScope; limit?: number },
): Promise<RankingResult> {
    const limit = opts.limit ?? 10;
    const season = getCurrentSeason();
    const effectiveScope: RankingScope =
        opts.scope === 'season' && !season.active ? 'all-time' : opts.scope;

    const key = cacheKeyFor(effectiveScope, season);
    const now = Date.now();
    const cached = cache.get(key);

    let raw: CacheEntry['raw'];
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
        raw = cached.raw;
    } else {
        raw = await fetchRaw(effectiveScope, season);
        cache.set(key, { fetchedAt: now, raw });
    }

    if (raw.length === 0) {
        return {
            scope: effectiveScope,
            seasonName: effectiveScope === 'season' ? season.name : null,
            entries: [],
            viewerRank: null,
            viewerEntry: null,
        };
    }

    // Ordena por pontos desc, depois por count desc, depois por userId (stable).
    raw.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.count !== a.count) return b.count - a.count;
        return a.referrerUserId.localeCompare(b.referrerUserId);
    });

    // Resolve nome + opt-in pros que precisamos (top N + viewer).
    const idsToResolve = new Set<string>();
    raw.slice(0, limit).forEach((row) => idsToResolve.add(row.referrerUserId));
    if (viewerUserId) idsToResolve.add(viewerUserId);

    const users = await withRlsUserContext(MGM_RANKING_RLS_USER_ID, async (tx) =>
        tx.user.findMany({
            where: { id: { in: Array.from(idsToResolve) } },
            select: { id: true, name: true, mgmRankingOptIn: true },
        }),
    );
    const userById = new Map(users.map((u) => [u.id, u]));

    const buildEntry = (row: CacheEntry['raw'][number], rank: number): RankingEntry => {
        const u = userById.get(row.referrerUserId);
        const optedOut = u ? !u.mgmRankingOptIn : false;
        const displayName = optedOut
            ? 'Indicador anônimo'
            : firstNameOf(u?.name ?? '') || 'Aluno';
        return {
            rank,
            userId: row.referrerUserId,
            displayName,
            referralsCount: row.count,
            pointsTotal: row.points,
            isOptedOut: optedOut,
        };
    };

    const entries = raw.slice(0, limit).map((row, idx) => buildEntry(row, idx + 1));

    let viewerRank: number | null = null;
    let viewerEntry: RankingEntry | null = null;
    if (viewerUserId) {
        const viewerIdx = raw.findIndex((r) => r.referrerUserId === viewerUserId);
        if (viewerIdx >= 0) {
            viewerRank = viewerIdx + 1;
            // Viewer sempre vê a própria entry com nome real (não anônimo).
            const u = userById.get(viewerUserId);
            const row = raw[viewerIdx];
            viewerEntry = {
                rank: viewerRank,
                userId: viewerUserId,
                displayName: firstNameOf(u?.name ?? '') || 'Você',
                referralsCount: row.count,
                pointsTotal: row.points,
                isOptedOut: u ? !u.mgmRankingOptIn : false,
            };
        }
    }

    return {
        scope: effectiveScope,
        seasonName: effectiveScope === 'season' ? season.name : null,
        entries,
        viewerRank,
        viewerEntry,
    };
}

export async function setRankingOptIn(userId: string, optIn: boolean): Promise<void> {
    // Owner update — User não tem RLS, mas mantemos contexto pra consistência.
    await withRlsUserContext(userId, async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: { mgmRankingOptIn: optIn },
        });
    });
}
