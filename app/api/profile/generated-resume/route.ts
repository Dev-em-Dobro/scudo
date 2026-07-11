import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { getOrCreateUserProfile } from '@/app/lib/profile/profile';
import {
    ensureGeneratedResumeIsCurrent,
    getCurrentGeneratedResumeDocument,
    saveGeneratedResumeDocument,
} from '@/app/lib/resume/syncGeneratedResume';
import { withRlsUserContext } from '@/app/lib/rls';
import {
    checkUserRateLimit,
    RATE_LIMIT_RULES,
    rateLimitResponse,
} from '@/app/lib/security/rateLimit';
import { atsResumeDocumentSchema } from '@/app/lib/validations/generatedResume';

export const runtime = 'nodejs';

export async function GET() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const rateLimit = checkUserRateLimit(session.user.id, 'generatedResumePdfDownload', RATE_LIMIT_RULES.generatedResumePdfDownload);
    if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit);
    }

    await ensureGeneratedResumeIsCurrent(session.user.id);

    const profile = await withRlsUserContext(session.user.id, async (transaction) => {
        const existing = await transaction.userProfile.findUnique({
            where: { userId: session.user.id },
            select: {
                generatedResumePdf: true,
                generatedResumeUpdatedAt: true,
                fullName: true,
            },
        });

        return existing;
    });

    if (!profile?.generatedResumePdf || !profile.generatedResumeUpdatedAt) {
        return NextResponse.json({ error: 'Currículo gerado ainda não disponível.' }, { status: 404 });
    }

    const safeName = (profile.fullName ?? session.user.name ?? 'curriculo')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

    const filename = `${safeName || 'curriculo'}-scudo-ats.pdf`;

    return new NextResponse(Buffer.from(profile.generatedResumePdf), {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'private, no-store',
        },
    });
}

export async function HEAD() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return new NextResponse(null, { status: 401 });
    }

    const profile = await getOrCreateUserProfile({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });

    if (!profile.generatedResumePdf) {
        return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(null, { status: 200 });
}

export async function POST() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const rateLimit = checkUserRateLimit(session.user.id, 'generatedResumeRead', RATE_LIMIT_RULES.generatedResumeRead);
    if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit);
    }

    const current = await getCurrentGeneratedResumeDocument(session.user.id);

    if (!current) {
        return NextResponse.json({ error: 'Currículo gerado ainda não disponível.' }, { status: 404 });
    }

    return NextResponse.json({
        document: current.document,
        updatedAt: current.updatedAt,
    });
}

const saveDocumentSchema = z.object({
    document: atsResumeDocumentSchema,
}).strict();

export async function PATCH(request: Request) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const rateLimit = checkUserRateLimit(session.user.id, 'generatedResumeSave', RATE_LIMIT_RULES.generatedResumeSave);
    if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit);
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = saveDocumentSchema.safeParse(rawBody);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Dados inválidos.', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const meta = await saveGeneratedResumeDocument(session.user.id, parsed.data.document);

    if (!meta) {
        return NextResponse.json({ error: 'Currículo gerado ainda não disponível.' }, { status: 404 });
    }

    const current = await getCurrentGeneratedResumeDocument(session.user.id);

    return NextResponse.json({
        message: 'Currículo salvo com sucesso.',
        meta,
        document: current?.document ?? parsed.data.document,
        updatedAt: current?.updatedAt ?? meta.updatedAt,
    });
}
