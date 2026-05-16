import { prisma } from '@/app/lib/prisma';

/**
 * Gera um referral code único (ex.: "beto-47") a partir do primeiro nome.
 * Slug ASCII (sem acento) + sufixo numérico de 2 dígitos. Até 10 tentativas
 * pra evitar colisão. `User` não tem RLS (mantida sem RLS p/ Better Auth),
 * então prisma direto é OK aqui.
 */
export async function generateReferralCode(firstName: string): Promise<string> {
    const base =
        (firstName ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[^a-z]/g, '')
            .slice(0, 12) || 'aluno';

    for (let attempt = 0; attempt < 10; attempt++) {
        const code = `${base}-${Math.floor(10 + Math.random() * 90)}`;
        const existing = await prisma.user.findUnique({
            where: { mgmReferralCode: code },
            select: { id: true },
        });
        if (!existing) {
            return code;
        }
    }

    throw new Error('Referral code colidiu 10x — escalar (espaço de sufixo esgotado para o slug).');
}
