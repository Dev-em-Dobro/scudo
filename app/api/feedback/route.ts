import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { auth } from '@/app/lib/auth';
import { withRlsUserContext } from '@/app/lib/rls';
import { productFeedbackSchema } from '@/app/lib/validations/feedback';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60_000;

function sanitizeOptionalText(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function sanitizePagePath(value: string | undefined) {
  const normalized = sanitizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  const trimmed = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return trimmed.slice(0, 200);
}

function normalizeContactEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = productFeedbackSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Dados inválidos.',
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  if (payload.honey) {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  try {
    const recentFeedback = await withRlsUserContext(session.user.id, async (transaction) => transaction.productFeedback.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
      },
    }));

    if (recentFeedback) {
      return NextResponse.json(
        { error: 'Aguarde alguns segundos antes de enviar outro feedback.' },
        { status: 429 }
      );
    }

    const created = await withRlsUserContext(session.user.id, async (transaction) => transaction.productFeedback.create({
      data: {
        userId: session.user.id,
        category: payload.category,
        status: 'RECEIVED',
        title: payload.title.trim(),
        description: payload.description.trim(),
        expectedBehavior: sanitizeOptionalText(payload.expectedBehavior),
        impact: sanitizeOptionalText(payload.impact),
        pagePath: sanitizePagePath(payload.pagePath),
        contactEmail: normalizeContactEmail(session.user.email),
      },
      select: {
        id: true,
        createdAt: true,
      },
    }));

    return NextResponse.json({
      ok: true,
      feedback: created,
    });
  } catch (error) {
    console.error('Falha ao registrar feedback de produto.', error);
    return NextResponse.json(
      { error: 'Não foi possível registrar seu feedback agora. Tente novamente em instantes.' },
      { status: 500 }
    );
  }
}
