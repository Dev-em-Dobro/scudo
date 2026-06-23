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
 * + 2 prêmios de temporada (seasonOnly — só aparecem/resgatam com MGM_BOOST_* ativo):
 *  - 300 pts: Camiseta Exclusiva da Copa (PHYSICAL, merch-camiseta) — Temporada Copa do Mundo
 *  - 600 pts: PIX de R$ 500            (PIX,      temporada-copa-2026) — Temporada Copa do Mundo
 *
 * Legado desativado (active=false, mantido no seed pra ser desligado idempotentemente):
 *  - Cadeira Gamer (temporada-copa-2026) — substituída pelo PIX de R$ 500
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
        slug: 'pix-500-copa-2026',
        name: 'PIX de R$ 500',
        description:
            'Prêmio especial da Temporada Copa do Mundo: R$ 500 na sua conta via PIX. Exclusivo de quem resgatar durante a temporada — após o resgate, a equipe DevQuest confirma sua chave PIX pelo e-mail cadastrado e envia o valor.',
        costPoints: 600,
        type: 'PIX',
        rewardFamily: 'temporada-copa-2026',
        metadata: { amountCents: 50000 },
        seasonOnly: true,
        sortOrder: 5, // primeiro card da vitrine enquanto a temporada rola
    },
    {
        slug: 'camiseta-copa-2026',
        name: 'Camiseta Exclusiva da Copa',
        description:
            'Camiseta exclusiva da Temporada Copa do Mundo — modelo especial, produzida sob demanda. Disponível só pra quem resgatar durante a temporada.',
        costPoints: 300,
        type: 'PHYSICAL',
        // Mesma família da camiseta padrão: 1 camiseta por aluno (a exclusiva
        // substitui a normal durante a temporada) e o modal já pede o tamanho.
        rewardFamily: 'merch-camiseta',
        metadata: { sku: 'tshirt-copa-2026' },
        seasonOnly: true,
        sortOrder: 6, // logo após o PIX na vitrine da temporada
    },
    // Legado: substituído pelo PIX. Mantido só pra desativar de forma idempotente.
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
        active: false,
        sortOrder: 5,
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
                    active: reward.active ?? true,
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
                    active: reward.active ?? true,
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
