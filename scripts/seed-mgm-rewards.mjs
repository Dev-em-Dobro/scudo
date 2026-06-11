#!/usr/bin/env node
/**
 * Seed do catálogo MGM (spec v0.4 §v0.4-D, v0.5 §v0.5-D).
 *
 * 6 prêmios permanentes — sob demanda (sem estoque):
 *  - 100 pts: Camiseta DevQuest         (PHYSICAL,         merch-camiseta)
 *  - 200 pts: Livro Clean Code          (PHYSICAL,         merch-livro)
 *  - 300 pts: 30% off renovação         (DIGITAL_DISCOUNT, renovacao)
 *  - 400 pts: 40% off renovação         (DIGITAL_DISCOUNT, renovacao)
 *  - 500 pts: 50% off renovação         (DIGITAL_DISCOUNT, renovacao)
 *  - 800 pts: 1 ano grátis na renovação (DIGITAL_VOUCHER,  renovacao)
 *
 * + 1 prêmio de temporada (seasonOnly — só aparece/resgata com MGM_BOOST_* ativo):
 *  - 600 pts: Cadeira Gamer (PHYSICAL, temporada-copa-2026) — Temporada Copa do Mundo
 *
 * Idempotente: usa upsert por slug. Roda manualmente:
 *   node scripts/seed-mgm-rewards.mjs              # → DATABASE_URL (prod/dev)
 *   DATABASE_URL=$LOCAL_DATABASE_URL node scripts/seed-mgm-rewards.mjs
 *
 * RLS: seed roda com contexto `system:mgm-admin` (policy `mgmreward_admin_write`).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REWARDS = [
    {
        slug: 'camiseta-devquest',
        name: 'Camiseta DevQuest',
        description: 'Camiseta exclusiva DevQuest. Produzida sob demanda na Bonjour Estamparia.',
        costPoints: 100,
        type: 'PHYSICAL',
        rewardFamily: 'merch-camiseta',
        metadata: { sku: 'tshirt-devquest' },
        sortOrder: 10,
    },
    {
        slug: 'livro-clean-code',
        name: 'Livro Clean Code',
        description: 'Clean Code: A Handbook of Agile Software Craftsmanship — Robert C. Martin.',
        costPoints: 200,
        type: 'PHYSICAL',
        rewardFamily: 'merch-livro',
        metadata: { sku: 'book-clean-code' },
        sortOrder: 20,
    },
    {
        slug: 'renovacao-30-off',
        name: '30% off na renovação',
        description: 'Cupom de 30% de desconto aplicado na sua próxima renovação anual do DevQuest.',
        costPoints: 300,
        type: 'DIGITAL_DISCOUNT',
        rewardFamily: 'renovacao',
        metadata: { discountPercent: 30 },
        sortOrder: 30,
    },
    {
        slug: 'renovacao-40-off',
        name: '40% off na renovação',
        description: 'Cupom de 40% de desconto aplicado na sua próxima renovação anual do DevQuest.',
        costPoints: 400,
        type: 'DIGITAL_DISCOUNT',
        rewardFamily: 'renovacao',
        metadata: { discountPercent: 40 },
        sortOrder: 40,
    },
    {
        slug: 'renovacao-50-off',
        name: '50% off na renovação',
        description: 'Cupom de 50% de desconto aplicado na sua próxima renovação anual do DevQuest.',
        costPoints: 500,
        type: 'DIGITAL_DISCOUNT',
        rewardFamily: 'renovacao',
        metadata: { discountPercent: 50 },
        sortOrder: 50,
    },
    {
        slug: 'renovacao-1-ano-gratis',
        name: '1 ano grátis na renovação',
        description: 'Renovação anual do DevQuest 100% gratuita — equivalente a 12 meses.',
        costPoints: 800,
        type: 'DIGITAL_VOUCHER',
        rewardFamily: 'renovacao',
        metadata: { discountPercent: 100, durationMonths: 12 },
        sortOrder: 60,
    },
    {
        slug: 'cadeira-gamer-copa-2026',
        name: 'Cadeira Gamer',
        description:
            'Prêmio especial da Temporada Copa do Mundo. Cadeira gamer enviada pra sua casa — exclusiva de quem resgatar durante a temporada.',
        costPoints: 600,
        type: 'PHYSICAL',
        rewardFamily: 'temporada-copa-2026',
        metadata: { sku: 'cadeira-gamer-copa-2026' },
        seasonOnly: true,
        sortOrder: 5, // primeiro card da vitrine enquanto a temporada rola
    },
];

async function main() {
    // RLS: aplica contexto admin pro upsert passar nas policies.
    await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.user_id', 'system:mgm-admin', true)`;

        for (const reward of REWARDS) {
            const result = await tx.mgmReward.upsert({
                where: { slug: reward.slug },
                create: {
                    slug: reward.slug,
                    name: reward.name,
                    description: reward.description,
                    costPoints: reward.costPoints,
                    type: reward.type,
                    rewardFamily: reward.rewardFamily,
                    metadata: reward.metadata,
                    active: true,
                    seasonOnly: reward.seasonOnly ?? false,
                    sortOrder: reward.sortOrder,
                },
                update: {
                    name: reward.name,
                    description: reward.description,
                    costPoints: reward.costPoints,
                    type: reward.type,
                    rewardFamily: reward.rewardFamily,
                    metadata: reward.metadata,
                    active: true,
                    seasonOnly: reward.seasonOnly ?? false,
                    sortOrder: reward.sortOrder,
                },
            });
            console.log(`  ✔ ${result.slug} (${result.costPoints} pts)`);
        }
    });
}

main()
    .catch((err) => {
        console.error('Seed falhou:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
