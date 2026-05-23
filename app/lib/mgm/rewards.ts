import { Prisma, type MgmReward, type MgmRewardType } from '@prisma/client';

import { withRlsUserContext } from '@/app/lib/rls';
import { MGM_ADMIN_RLS_USER_ID } from '@/app/lib/mgm/rlsContext';

/**
 * Catálogo de prêmios MGM (spec v0.4 §v0.4-D).
 *
 * Famílias (`rewardFamily`) controlam exclusividade de resgate:
 *  - `merch-camiseta` — camiseta DevQuest
 *  - `merch-livro`    — livro Clean Code
 *  - `renovacao`      — descontos de 30/40/50% + 1 ano grátis (não acumulativos)
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
        sortOrder: row.sortOrder,
    };
}

/** Vitrine: prêmios ativos ordenados por sortOrder. Chamada com sessão do aluno. */
export async function listActiveRewards(viewerUserId: string): Promise<MgmRewardView[]> {
    return withRlsUserContext(viewerUserId, async (tx) => {
        const rows = await tx.mgmReward.findMany({
            where: { active: true },
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
                sortOrder: input.sortOrder ?? 0,
            },
        });
        return toView(row);
    });
}

