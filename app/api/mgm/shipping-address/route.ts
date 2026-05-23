import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { isOfficialStudentUser } from '@/app/lib/jornada/service';

export const runtime = 'nodejs';

/**
 * Edita o endereço de entrega salvo no perfil do aluno (spec v0.4 §v0.4-D / decisão D).
 * Pré-preenche todos os próximos resgates físicos.
 *
 * Não aceita `notes` — esse campo é por-resgate (tamanho de camiseta, etc.).
 */

const ShippingSchema = z.object({
    name: z.string().min(1).max(200),
    phone: z.string().max(40).optional(),
    address: z.string().min(1).max(500),
    city: z.string().min(1).max(120),
    state: z.string().min(1).max(40),
    zip: z.string().min(1).max(30),
});

export async function PUT(request: NextRequest) {
    if (!isMgmEnabled()) {
        return NextResponse.json({ error: 'MGM desabilitado.' }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const isOfficial = await isOfficialStudentUser(session.user.id);
    if (!isOfficial) {
        return NextResponse.json({ error: 'Apenas alunos oficiais.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = ShippingSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Payload inválido.', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const data = {
        ...parsed.data,
        state: parsed.data.state.toUpperCase(),
    };

    // UserProfile não tem RLS — escrita direta pelo Prisma.
    // upsert pra cobrir caso de aluno sem profile (raro mas possível).
    await prisma.userProfile.upsert({
        where: { userId: session.user.id },
        create: {
            userId: session.user.id,
            mgmShippingAddress: data as unknown as Prisma.InputJsonValue,
        },
        update: {
            mgmShippingAddress: data as unknown as Prisma.InputJsonValue,
        },
    });

    return NextResponse.json({ ok: true, shippingAddress: data });
}
