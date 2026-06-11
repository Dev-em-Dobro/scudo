import { Prisma, type MgmReward, type MgmRewardType } from '@prisma/client';

import { withRlsUserContext } from '@/app/lib/rls';
import { MGM_ADMIN_RLS_USER_ID } from '@/app/lib/mgm/rlsContext';
import { isSeasonActive } from '@/app/lib/mgm/seasons';

/**
 * Catálogo de prêmios MGM (spec v0.4 §v0.4-D, v0.5 §v0.5-A/C).
 *
 * Famílias (`rewardFamily`) controlam exclusividade de resgate:
 *  - `merch-camiseta` — camiseta DevQuest
 *  - `merch-livro`    — livro Clean Code
 *  - `renovacao`      — descontos de 30/40/50% + 1 ano grátis (não acumulativos)
 *  - `temporada-*`    — prêmio especial da temporada (1 família POR temporada;
 *                       `seasonOnly=true` → só aparece/resgata com temporada ativa)
 *
 * Aluno pode ter 1 resgate ativo por família. Implementado em `redemptions.ts`.
 */

export interface MgmRewardView {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    costPoints: number;
    type: MgmRewardType;
    rewardFamily: string;
    metadata: Prisma.JsonValue | null;
    seasonOnly: boolean;
    sortOrder: number;
}

function toView(row: MgmReward): MgmRewardView {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        costPoints: row.costPoints,
        type: row.type,
        rewardFamily: row.rewardFamily,
        metadata: row.metadata as Prisma.JsonValue | null,
        seasonOnly: row.seasonOnly,
        sortOrder: row.sortOrder,
    };
}

/**
 * Vitrine: prêmios ativos ordenados por sortOrder. Chamada com sessão do aluno.
 * Rewards `seasonOnly` só entram com temporada ativa (v0.5-C) — fora da janela
 * o card some sozinho, sem tocar em `active`.
 */
export async function listActiveRewards(viewerUserId: string): Promise<MgmRewardView[]> {
    return withRlsUserContext(viewerUserId, async (tx) => {
        const rows = await tx.mgmReward.findMany({
            where: {
                active: true,
                ...(isSeasonActive() ? {} : { seasonOnly: false }),
            },
            orderBy: [{ sortOrder: 'asc' }, { costPoints: 'asc' }],
        });
        return rows.map(toView);
    });
}

/** Busca um prêmio por slug (vitrine + detalhe de resgate). */
export async function getRewardBySlug(
    viewerUserId: string,
    slug: string,
): Promise<MgmRewardView | null> {
    return withRlsUserContext(viewerUserId, async (tx) => {
        const row = await tx.mgmReward.findUnique({ where: { slug } });
        return row ? toView(row) : null;
    });
}

export interface UpsertRewardInput {
    slug: string;
    name: string;
    description?: string | null;
    costPoints: number;
    type: MgmRewardType;
    rewardFamily: string;
    metadata?: Prisma.InputJsonValue | null;
    active?: boolean;
    seasonOnly?: boolean;
    sortOrder?: number;
}

/** Seed/admin: upsert do catálogo. Usa contexto RLS de admin. */
export async function upsertReward(input: UpsertRewardInput): Promise<MgmRewardView> {
    return withRlsUserContext(MGM_ADMIN_RLS_USER_ID, async (tx) => {
        const row = await tx.mgmReward.upsert({
            where: { slug: input.slug },
            create: {
                slug: input.slug,
                name: input.name,
                description: input.description ?? null,
                costPoints: input.costPoints,
                type: input.type,
                rewardFamily: input.rewardFamily,
                metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                active: input.active ?? true,
                seasonOnly: input.seasonOnly ?? false,
                sortOrder: input.sortOrder ?? 0,
            },
            update: {
                name: input.name,
                description: input.description ?? null,
                costPoints: input.costPoints,
                type: input.type,
                rewardFamily: input.rewardFamily,
                metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                active: input.active ?? true,
                seasonOnly: input.seasonOnly ?? false,
                sortOrder: input.sortOrder ?? 0,
            },
        });
        return toView(row);
    });
}

