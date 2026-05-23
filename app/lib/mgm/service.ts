import { Prisma } from '@prisma/client';

import { prisma } from '@/app/lib/prisma';
import { withRlsUserContext } from '@/app/lib/rls';
import { computeBalanceWithinTx } from '@/app/lib/mgm/balance';

import { generateReferralCode } from './referral-code';

/**
 * Camada de serviço da página /indique-e-ganhe.
 *
 * RLS (spec §C-B): `MgmReferral` tem owner policy por `referrerUserId`. Toda
 * leitura do indicador é envolvida em `withRlsUserContext(userId, …)`.
 * `User` não tem RLS → prisma direto pro referral code.
 */

export interface MgmStatusCards {
    pendingCount: number;
    validCount: number;
    /** Resgates já entregues (delivered) — Fase 1. */
    redeemedCount: number;
    /** Pontos disponíveis pra resgate (valid − spent). */
    pointsAvailable: number;
    pointsPending: number;
    pointsSpent: number;
}

export interface MgmReferralView {
    id: string;
    referredName: string | null;
    referredEmailMasked: string;
    saleAmount: string;
    pointsEarned: number;
    status: 'pending' | 'valid' | 'invalid' | 'reverted';
    invalidReason: string | null;
    signedUpAt: string;
    guaranteeUntil: string;
}

function isUniqueViolation(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
    );
}

function firstNameOf(name: string | null | undefined): string {
    return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

/** Mascara o e-mail do indicado pra exibição (j***@gmail.com). */
function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) {
        return '***';
    }
    const head = local.slice(0, 1);
    return `${head}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

/**
 * Retorna o referral code do aluno, gerando lazy na 1ª visita.
 * Trata corrida (duas abas na 1ª visita) via retry no unique constraint.
 */
export async function getOrCreateReferralCode(
    userId: string,
    name: string | null | undefined,
): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { mgmReferralCode: true, name: true },
    });

    if (user?.mgmReferralCode) {
        return user.mgmReferralCode;
    }

    const firstName = firstNameOf(name ?? user?.name);

    for (let attempt = 0; attempt < 5; attempt++) {
        const code = await generateReferralCode(firstName);
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { mgmReferralCode: code },
            });
            return code;
        } catch (error) {
            if (!isUniqueViolation(error)) {
                throw error;
            }
            // Corrida: outro request setou o code (mesmo user) ou o code colidiu.
            const fresh = await prisma.user.findUnique({
                where: { id: userId },
                select: { mgmReferralCode: true },
            });
            if (fresh?.mgmReferralCode) {
                return fresh.mgmReferralCode;
            }
            // colisão no code → tenta de novo
        }
    }

    throw new Error('getOrCreateReferralCode: falhou após 5 tentativas.');
}

export async function getStatusCards(userId: string): Promise<MgmStatusCards> {
    return withRlsUserContext(userId, async (tx) => {
        const [grouped, balance, deliveredCount] = await Promise.all([
            tx.mgmReferral.groupBy({
                by: ['status'],
                where: { referrerUserId: userId },
                _count: { _all: true },
            }),
            computeBalanceWithinTx(tx, userId),
            tx.mgmRedemption.count({
                where: { userId, status: 'delivered' },
            }),
        ]);

        const cards: MgmStatusCards = {
            pendingCount: 0,
            validCount: 0,
            redeemedCount: deliveredCount,
            pointsAvailable: balance.pointsAvailable,
            pointsPending: balance.pointsPending,
            pointsSpent: balance.pointsSpent,
        };

        for (const row of grouped) {
            if (row.status === 'pending') {
                cards.pendingCount = row._count._all;
            } else if (row.status === 'valid') {
                cards.validCount = row._count._all;
            }
        }

        return cards;
    });
}

export async function listReferrals(
    userId: string,
    opts?: { limit?: number },
): Promise<MgmReferralView[]> {
    const limit = opts?.limit ?? 10;

    return withRlsUserContext(userId, async (tx) => {
        const rows = await tx.mgmReferral.findMany({
            where: { referrerUserId: userId },
            orderBy: { signedUpAt: 'desc' },
            take: limit,
        });

        return rows.map((row) => ({
            id: row.id,
            referredName: row.referredName,
            referredEmailMasked: maskEmail(row.referredEmail),
            saleAmount: row.saleAmount.toString(),
            pointsEarned: row.pointsEarned,
            status: row.status,
            invalidReason: row.invalidReason,
            signedUpAt: row.signedUpAt.toISOString(),
            guaranteeUntil: row.guaranteeUntil.toISOString(),
        }));
    });
}
