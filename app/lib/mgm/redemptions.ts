import { Prisma, type MgmRedemption, type MgmReward, type MgmRedemptionStatus } from '@prisma/client';

import { withRlsUserContext } from '@/app/lib/rls';
import { computeBalanceWithinTx } from '@/app/lib/mgm/balance';
import { MGM_ADMIN_RLS_USER_ID } from '@/app/lib/mgm/rlsContext';

/**
 * Resgates de prêmios MGM (spec v0.4 §v0.4-D/I).
 *
 * Regras críticas:
 *  1. **Família exclusiva (decisão 3, 2026-05-23):** aluno pode ter no MÁXIMO
 *     1 resgate ATIVO (status != rejected/cancelled) por `rewardFamily`.
 *     Quem pegar 30% off NÃO pode resgatar 40%/50%/100% (família `renovacao`).
 *  2. **Saldo só com pontos `valid`** (decisão A): pontos pending não contam.
 *  3. **Saldo negativo bloqueia novos resgates** (decisão B): refund pós-resgate
 *     que zere saldo NÃO cobra de volta — só impede próximos até reerguer.
 *  4. **Aluno cancela `requested`** (decisão C): vira `cancelled`, estorna ponto.
 */

export type RedemptionStatus = MgmRedemptionStatus;

export interface ShippingInfo {
    name: string;
    phone?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    notes?: string;
}

export interface DeliveryInfo {
    couponCode?: string;
    tracking?: string;
    deliveredVia?: string;
}

export interface MgmRedemptionView {
    id: string;
    rewardSlug: string;
    rewardName: string;
    rewardType: MgmReward['type'];
    rewardFamily: string;
    costSnapshot: number;
    status: RedemptionStatus;
    shippingInfo: ShippingInfo | null;
    deliveryInfo: DeliveryInfo | null;
    rejectedReason: string | null;
    requestedAt: string;
    approvedAt: string | null;
    deliveredAt: string | null;
    cancelledAt: string | null;
}

function toView(
    row: MgmRedemption & { reward: MgmReward },
): MgmRedemptionView {
    return {
        id: row.id,
        rewardSlug: row.reward.slug,
        rewardName: row.reward.name,
        rewardType: row.reward.type,
        rewardFamily: row.rewardFamily,
        costSnapshot: row.costSnapshot,
        status: row.status,
        shippingInfo: (row.shippingInfo as unknown as ShippingInfo | null) ?? null,
        deliveryInfo: (row.deliveryInfo as unknown as DeliveryInfo | null) ?? null,
        rejectedReason: row.rejectedReason,
        requestedAt: row.requestedAt.toISOString(),
        approvedAt: row.approvedAt?.toISOString() ?? null,
        deliveredAt: row.deliveredAt?.toISOString() ?? null,
        cancelledAt: row.cancelledAt?.toISOString() ?? null,
    };
}

// ─────────────────────────────────────────────────────────────
// Aluno: pedir resgate
// ─────────────────────────────────────────────────────────────

export class RedemptionError extends Error {
    code:
        | 'reward_not_found'
        | 'reward_inactive'
        | 'family_already_redeemed'
        | 'insufficient_balance';

    constructor(code: RedemptionError['code'], message: string) {
        super(message);
        this.code = code;
    }
}

export interface RequestRedemptionInput {
    userId: string;
    rewardSlug: string;
    shippingInfo?: ShippingInfo | null;
}

export interface RequestRedemptionResult {
    redemption: MgmRedemptionView;
    /** Saldo restante após o débito lógico do resgate. */
    balanceAfter: number;
}

export async function requestRedemption(
    input: RequestRedemptionInput,
): Promise<RequestRedemptionResult> {
    // Transação serializável: evita race de duplo resgate na mesma família
    // ou estouro de saldo entre 2 cliques quase-simultâneos.
    return withRlsUserContext(
        input.userId,
        async (tx) => {
            const reward = await tx.mgmReward.findUnique({
                where: { slug: input.rewardSlug },
            });
            if (!reward) {
                throw new RedemptionError('reward_not_found', 'Prêmio não encontrado.');
            }
            if (!reward.active) {
                throw new RedemptionError('reward_inactive', 'Prêmio indisponível no momento.');
            }

            // Regra de família: máx 1 resgate ativo por família por aluno.
            const existingFamily = await tx.mgmRedemption.findFirst({
                where: {
                    userId: input.userId,
                    rewardFamily: reward.rewardFamily,
                    status: { notIn: ['rejected', 'cancelled'] },
                },
                select: { id: true },
            });
            if (existingFamily) {
                throw new RedemptionError(
                    'family_already_redeemed',
                    `Você já tem um resgate ativo nesta categoria (${reward.rewardFamily}).`,
                );
            }

            // Saldo: só pontos VALID resgatam.
            const balance = await computeBalanceWithinTx(tx, input.userId);
            if (balance.pointsAvailable < reward.costPoints) {
                throw new RedemptionError(
                    'insufficient_balance',
                    `Saldo insuficiente. Disponível: ${balance.pointsAvailable} pts. Custo: ${reward.costPoints} pts.`,
                );
            }

            const created = await tx.mgmRedemption.create({
                data: {
                    userId: input.userId,
                    rewardId: reward.id,
                    rewardFamily: reward.rewardFamily,
                    costSnapshot: reward.costPoints,
                    shippingInfo: input.shippingInfo
                        ? (input.shippingInfo as unknown as Prisma.InputJsonValue)
                        : Prisma.JsonNull,
                },
                include: { reward: true },
            });

            // Persiste endereço no UserProfile pra pré-preencher próximos resgates.
            // Sem o campo `notes` — esse é por-resgate (tamanho de camiseta etc.).
            if (input.shippingInfo) {
                const { notes: _notes, ...addressOnly } = input.shippingInfo;
                await tx.userProfile.updateMany({
                    where: { userId: input.userId },
                    data: {
                        mgmShippingAddress: addressOnly as unknown as Prisma.InputJsonValue,
                    },
                });
            }

            return {
                redemption: toView(created),
                balanceAfter: balance.pointsAvailable - reward.costPoints,
            };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
}

// ─────────────────────────────────────────────────────────────
// Aluno: cancelar resgate `requested`
// ─────────────────────────────────────────────────────────────

export class CancelRedemptionError extends Error {
    code: 'not_found' | 'not_cancellable';
    constructor(code: CancelRedemptionError['code'], message: string) {
        super(message);
        this.code = code;
    }
}

export async function cancelRedemption(userId: string, redemptionId: string): Promise<MgmRedemptionView> {
    return withRlsUserContext(userId, async (tx) => {
        const existing = await tx.mgmRedemption.findFirst({
            where: { id: redemptionId, userId },
            select: { id: true, status: true },
        });
        if (!existing) {
            throw new CancelRedemptionError('not_found', 'Resgate não encontrado.');
        }
        if (existing.status !== 'requested') {
            throw new CancelRedemptionError(
                'not_cancellable',
                'Só dá pra cancelar enquanto o resgate está pendente de aprovação.',
            );
        }

        const updated = await tx.mgmRedemption.update({
            where: { id: redemptionId },
            data: { status: 'cancelled', cancelledAt: new Date() },
            include: { reward: true },
        });
        return toView(updated);
    });
}

// ─────────────────────────────────────────────────────────────
// Aluno: listar próprios resgates
// ─────────────────────────────────────────────────────────────

export async function listRedemptions(
    userId: string,
    opts?: { limit?: number },
): Promise<MgmRedemptionView[]> {
    const limit = opts?.limit ?? 20;
    return withRlsUserContext(userId, async (tx) => {
        const rows = await tx.mgmRedemption.findMany({
            where: { userId },
            orderBy: { requestedAt: 'desc' },
            take: limit,
            include: { reward: true },
        });
        return rows.map(toView);
    });
}

// ─────────────────────────────────────────────────────────────
// Admin: aprovar / entregar / rejeitar
// ─────────────────────────────────────────────────────────────

export interface AdminListFilters {
    status?: RedemptionStatus | RedemptionStatus[];
    rewardFamily?: string;
    limit?: number;
}

export interface MgmRedemptionAdminView extends MgmRedemptionView {
    userId: string;
    userEmail: string;
    userName: string;
}

export async function adminListRedemptions(
    filters: AdminListFilters = {},
): Promise<MgmRedemptionAdminView[]> {
    const limit = filters.limit ?? 100;
    const statusFilter = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status
          ? { equals: filters.status }
          : undefined;

    return withRlsUserContext(MGM_ADMIN_RLS_USER_ID, async (tx) => {
        const rows = await tx.mgmRedemption.findMany({
            where: {
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(filters.rewardFamily ? { rewardFamily: filters.rewardFamily } : {}),
            },
            orderBy: { requestedAt: 'desc' },
            take: limit,
            include: {
                reward: true,
                user: { select: { id: true, email: true, name: true } },
            },
        });
        return rows.map((row) => ({
            ...toView(row),
            userId: row.user.id,
            userEmail: row.user.email,
            userName: row.user.name,
        }));
    });
}

export async function adminApproveRedemption(redemptionId: string): Promise<MgmRedemptionView> {
    return withRlsUserContext(MGM_ADMIN_RLS_USER_ID, async (tx) => {
        const updated = await tx.mgmRedemption.update({
            where: { id: redemptionId },
            data: { status: 'approved', approvedAt: new Date() },
            include: { reward: true },
        });
        return toView(updated);
    });
}

export interface MarkDeliveredInput {
    redemptionId: string;
    deliveryInfo: DeliveryInfo;
}

export async function adminMarkDelivered(input: MarkDeliveredInput): Promise<MgmRedemptionView> {
    return withRlsUserContext(MGM_ADMIN_RLS_USER_ID, async (tx) => {
        const updated = await tx.mgmRedemption.update({
            where: { id: input.redemptionId },
            data: {
                status: 'delivered',
                deliveredAt: new Date(),
                deliveryInfo: input.deliveryInfo as unknown as Prisma.InputJsonValue,
                // Se foi entregue direto (digital), garante approvedAt populado.
                approvedAt: { set: new Date() },
            },
            include: { reward: true },
        });
        return toView(updated);
    });
}

export async function adminRejectRedemption(
    redemptionId: string,
    reason: string,
): Promise<MgmRedemptionView> {
    return withRlsUserContext(MGM_ADMIN_RLS_USER_ID, async (tx) => {
        const updated = await tx.mgmRedemption.update({
            where: { id: redemptionId },
            data: {
                status: 'rejected',
                rejectedReason: reason,
            },
            include: { reward: true },
        });
        return toView(updated);
    });
}

export class AdminShippingError extends Error {
    code: 'not_found' | 'not_editable';
    constructor(code: AdminShippingError['code'], message: string) {
        super(message);
        this.code = code;
    }
}

/**
 * Admin atualiza shippingInfo de um resgate (Gap 2).
 *
 * Permitido apenas enquanto o resgate está em `requested` ou `approved`.
 * Após `delivered` o item já foi enviado — não dá pra mudar destino.
 * Rejeitado/cancelado também não — perdeu sentido.
 */
export async function adminUpdateShipping(
    redemptionId: string,
    shippingInfo: ShippingInfo,
): Promise<MgmRedemptionView> {
    return withRlsUserContext(MGM_ADMIN_RLS_USER_ID, async (tx) => {
        const existing = await tx.mgmRedemption.findUnique({
            where: { id: redemptionId },
            select: { id: true, status: true },
        });
        if (!existing) {
            throw new AdminShippingError('not_found', 'Resgate não encontrado.');
        }
        if (existing.status !== 'requested' && existing.status !== 'approved') {
            throw new AdminShippingError(
                'not_editable',
                `Resgate em status "${existing.status}" não permite edição de endereço.`,
            );
        }

        const updated = await tx.mgmRedemption.update({
            where: { id: redemptionId },
            data: { shippingInfo: shippingInfo as unknown as Prisma.InputJsonValue },
            include: { reward: true },
        });
        return toView(updated);
    });
}
