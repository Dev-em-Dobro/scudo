import { Prisma } from '@prisma/client';

import { prisma } from '@/app/lib/prisma';

export type RlsTransaction = Prisma.TransactionClient;
type RlsTransactionOptions = {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
};

export async function setRlsUserContext(transaction: RlsTransaction, userId: string) {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
        throw new Error('RLS userId inválido para contexto de transação.');
    }

    await transaction.$executeRaw`SELECT set_config('app.user_id', ${normalizedUserId}, true)`;
}

export async function withRlsUserContext<T>(
    userId: string,
    run: (transaction: RlsTransaction) => Promise<T>,
    options?: RlsTransactionOptions,
) {
    return prisma.$transaction(async (transaction) => {
        await setRlsUserContext(transaction, userId);
        return run(transaction);
    }, options);
}
