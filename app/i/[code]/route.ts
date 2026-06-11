import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/app/lib/prisma';
import { withRlsUserContext } from '@/app/lib/rls';
import { isMgmEnabled } from '@/app/lib/featureFlags';
import { MGM_TRACKING_RLS_USER_ID } from '@/app/lib/mgm/rlsContext';

export const runtime = 'nodejs';

/**
 * Rota intermediária de tracking (spec §4.7 — P2).
 * `https://app/i/<code>` → registra `MgmClick` → `redirect(302)` pro checkout
 * Hubla com `?ref=` + utm (cobre P1 de graça). Code inválido → vai pro checkout
 * SEM tracking (não quebra a experiência do indicado). Falha de tracking nunca
 * bloqueia o redirect (P3/reconciliação cobre o resto).
 */

function clientIp(request: NextRequest): string | null {
    const fwd = request.headers.get('x-forwarded-for');
    if (fwd) {
        return fwd.split(',')[0]?.trim() || null;
    }
    return request.headers.get('x-real-ip');
}

/**
 * Monta o destino do checkout (absoluto). Retorna `null` quando
 * `MGM_CHECKOUT_URL` está ausente/inválido — o caller cai pra raiz do app
 * (absolutizada via request.url, pois NextResponse.redirect exige URL absoluta).
 */
function buildCheckoutUrl(code: string | null): string | null {
    const base = process.env.MGM_CHECKOUT_URL;

    // MGM_CHECKOUT_URL é pendência de deploy (stakeholder).
    if (!base) {
        console.warn('[mgm/i] MGM_CHECKOUT_URL não definido — fallback para "/".');
        return null;
    }

    try {
        const url = new URL(base);
        if (code) {
            url.searchParams.set('ref', code);
            // utm equivalentes — cobre P1 se a Hubla preservar qualquer um.
            url.searchParams.set('utm_source', 'mgm');
            url.searchParams.set('utm_medium', 'referral');
            url.searchParams.set('utm_content', code);
        }
        // Cupom fixo de campanha (desconto do indicado). Default INDIQUEMGM;
        // `MGM_CHECKOUT_COUPON` sobrescreve (string vazia desliga). Aplicado a
        // todo acesso pelo link de indicação — independente da validade do
        // `ref` (a atribuição é reconciliada à parte; o desconto melhora a
        // conversão de quem chegou pelo link).
        const coupon = (process.env.MGM_CHECKOUT_COUPON ?? 'INDIQUEMGM').trim();
        if (coupon) {
            url.searchParams.set('coupon', coupon);
        }
        return url.toString();
    } catch {
        console.warn('[mgm/i] MGM_CHECKOUT_URL inválido — fallback para "/".');
        return null;
    }
}

export async function GET(
    request: NextRequest,
    ctx: { params: Promise<{ code: string }> },
) {
    // Feature flag (default OFF): sem tracking nem redirect MGM até o launch.
    if (!isMgmEnabled()) {
        return NextResponse.redirect(new URL('/', request.url).toString(), 302);
    }

    const { code: rawCode } = await ctx.params;
    const code = rawCode?.trim() ?? '';

    const referrer = code
        ? await prisma.user.findUnique({
              where: { mgmReferralCode: code },
              select: { id: true },
          })
        : null;

    const isValidCode = Boolean(referrer);

    if (isValidCode) {
        const emailParam =
            request.nextUrl.searchParams.get('email')?.trim().toLowerCase() || null;

        try {
            await withRlsUserContext(MGM_TRACKING_RLS_USER_ID, async (tx) => {
                await tx.mgmClick.create({
                    data: {
                        referralCode: code,
                        referredEmail: emailParam,
                        ip: clientIp(request),
                        userAgent: request.headers.get('user-agent'),
                    },
                });
            });
        } catch (error) {
            // Tracking nunca bloqueia o redirect — P3 reconcilia.
            console.error('[mgm/i] Falha ao registrar MgmClick.', {
                error: error instanceof Error ? error.message : 'unknown_error',
            });
        }
    }

    const destination =
        buildCheckoutUrl(isValidCode ? code : null) ??
        new URL('/', request.url).toString();
    return NextResponse.redirect(destination, 302);
}
