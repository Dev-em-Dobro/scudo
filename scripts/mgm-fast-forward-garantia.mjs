#!/usr/bin/env node
/**
 * QA-only: acelera a garantia de 15d movendo MgmReferral pending → valid
 * sem esperar o cron diário.
 *
 * Roda com contexto RLS `system:mgm-cron` (mesma policy que o cron real usa).
 *
 * Modos:
 *   node scripts/mgm-fast-forward-garantia.mjs --all
 *       Move TODOS os pending → valid (independente da guaranteeUntil).
 *
 *   node scripts/mgm-fast-forward-garantia.mjs --user-id <id>
 *       Só os referrals onde referrerUserId = <id>.
 *
 *   node scripts/mgm-fast-forward-garantia.mjs --referral-id <id>
 *       Só um referral específico.
 *
 *   node scripts/mgm-fast-forward-garantia.mjs --dry-run
 *       Lista o que SERIA atualizado sem mexer no banco.
 *
 * ⚠️ NÃO usar em prod com dados reais — quebra a regra dos 15d. Pra QA
 *    em staging/local ou prod com dados de teste apenas.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs(argv) {
    const args = { mode: null, value: null, dryRun: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--all') args.mode = 'all';
        else if (a === '--user-id') {
            args.mode = 'user';
            args.value = argv[++i];
        } else if (a === '--referral-id') {
            args.mode = 'referral';
            args.value = argv[++i];
        } else if (a === '--dry-run') args.dryRun = true;
    }
    return args;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (!args.mode) {
        console.error('Uso: --all | --user-id <id> | --referral-id <id> [--dry-run]');
        process.exit(2);
    }

    const where = { status: 'pending' };
    if (args.mode === 'user') {
        if (!args.value) {
            console.error('--user-id precisa de um valor.');
            process.exit(2);
        }
        where.referrerUserId = args.value;
    } else if (args.mode === 'referral') {
        if (!args.value) {
            console.error('--referral-id precisa de um valor.');
            process.exit(2);
        }
        where.id = args.value;
    }

    await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.user_id', 'system:mgm-cron', true)`;

        const targets = await tx.mgmReferral.findMany({
            where,
            select: {
                id: true,
                referrerUserId: true,
                referredEmail: true,
                pointsEarned: true,
                guaranteeUntil: true,
            },
        });

        console.log(`Encontrados ${targets.length} referrals em 'pending'.`);
        for (const r of targets) {
            console.log(
                `  • ${r.id} · referrer=${r.referrerUserId} · ${r.referredEmail} · ${r.pointsEarned} pts · garantia até ${r.guaranteeUntil.toISOString()}`,
            );
        }

        if (args.dryRun) {
            console.log('\n(dry-run — nada foi alterado.)');
            return;
        }

        if (targets.length === 0) {
            return;
        }

        const result = await tx.mgmReferral.updateMany({
            where,
            data: { status: 'valid' },
        });
        console.log(`\n✔ ${result.count} referrals movidos pra 'valid'.`);
    });
}

main()
    .catch((err) => {
        console.error('Fast-forward falhou:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
