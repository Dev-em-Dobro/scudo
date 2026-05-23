import { withRlsUserContext, type RlsTransaction } from '@/app/lib/rls';

/**
 * Saldo de pontos do aluno — calculado on-demand (spec v0.4 §v0.4-F).
 *
 * Fórmula: SUM(pointsEarned dos referrals status='valid')
 *        − SUM(costSnapshot dos resgates status NOT IN ('rejected','cancelled'))
 *
 * **Só pontos `valid` contam pra resgate** (decisão A, 2026-05-23): pontos
 * `pending` ainda dentro da garantia 15d podem virar `reverted` por refund,
 * então não permitimos resgatar antes de validar.
 *
 * Saldo negativo é permitido: se refund pós-resgate revertesse pontos abaixo
 * do gasto, ops não cobra de volta — só bloqueia novos resgates até subir
 * acima de zero (decisão B). `requestRedemption` valida saldo ≥ cost.
 */

export interface MgmBalance {
    pointsValid: number; // soma dos pointsEarned status='valid' (já garantia)
    pointsPending: number; // status='pending' (informativo — não resgatável)
    pointsSpent: number; // gasto em resgates ativos
    pointsAvailable: number; // valid − spent (pode resgatar)
}

/**
 * Computa saldo dentro de uma transação existente (com RLS já aplicada).
 * Use pra `requestRedemption` que já está em txn com SELECT FOR UPDATE no User.
 */
export async function computeBalanceWithinTx(
    tx: RlsTransaction,
    userId: string,
): Promise<MgmBalance> {
    const [referralsAgg, redemptionsAgg] = await Promise.all([
        tx.mgmReferral.groupBy({
            by: ['status'],
            where: { referrerUserId: userId, status: { in: ['valid', 'pending'] } },
            _sum: { pointsEarned: true },
        }),
        tx.mgmRedemption.aggregate({
            where: {
                userId,
                status: { notIn: ['rejected', 'cancelled'] },
            },
            _sum: { costSnapshot: true },
        }),
    ]);

    let pointsValid = 0;
    let pointsPending = 0;
    for (const row of referralsAgg) {
        const points = row._sum.pointsEarned ?? 0;
        if (row.status === 'valid') {
            pointsValid = points;
        } else if (row.status === 'pending') {
            pointsPending = points;
        }
    }

    const pointsSpent = redemptionsAgg._sum.costSnapshot ?? 0;

    return {
        pointsValid,
        pointsPending,
        pointsSpent,
        pointsAvailable: pointsValid - pointsSpent,
    };
}

/** Variante pública: abre uma transação RLS com o userId da sessão. */
export async function getMgmBalance(userId: string): Promise<MgmBalance> {
    return withRlsUserContext(userId, async (tx) => computeBalanceWithinTx(tx, userId));
}
