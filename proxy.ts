import { NextRequest, NextResponse } from 'next/server';

/**
 * Rotas públicas que não exigem autenticação.
 * Prefixos de API com auth própria (secret) também são excluídos.
 */
const PUBLIC_PATHS = new Set([
    '/login',
    '/cadastro',
    '/acesso',
    '/recuperar-senha',
    '/redefinir-senha',
]);

const PUBLIC_API_PREFIXES = [
    '/api/auth',            // Better Auth internals + student-access
    '/api/health',          // Monitoramento
    '/api/jobs/webhook',    // Autenticado via JOBS_WEBHOOK_SECRET
    '/api/jobs/bootstrap',  // Autenticado via JOBS_BOOTSTRAP_SECRET + cron Vercel
];

/** Nomes do cookie de sessão do Better Auth (HTTP e HTTPS). */
const SESSION_COOKIE_NAMES = [
    'better-auth.session_token',
    '__Secure-better-auth.session_token',
];

function hasSessionCookie(request: NextRequest): boolean {
    return SESSION_COOKIE_NAMES.some(
        (name) => request.cookies.get(name) !== undefined,
    );
}

function isPublicApiPath(pathname: string): boolean {
    return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Arquivos estáticos e internos do Next.js — sempre permitir
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Rotas de API com auth própria — não interferir
    if (isPublicApiPath(pathname)) {
        return NextResponse.next();
    }

    // Rotas de página públicas — não interferir
    if (PUBLIC_PATHS.has(pathname)) {
        return NextResponse.next();
    }

    // A partir daqui, a rota requer sessão ativa
    const authenticated = hasSessionCookie(request);

    if (!authenticated) {
        // Rotas de API sem sessão → 401 JSON (evita redirect em fetch)
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Não autenticado.' },
                { status: 401 },
            );
        }

        // Páginas sem sessão → redirect para /login preservando destino
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Aplica o middleware em tudo, exceto:
         * - _next/static  (arquivos estáticos do Next.js)
         * - _next/image   (otimização de imagens)
         * - favicon.ico
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
