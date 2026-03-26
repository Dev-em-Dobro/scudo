'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import InitialOnboardingModal from '@/app/components/onboarding/InitialOnboardingModal';
import ScudoShieldIcon from '@/app/components/layout/ScudoShieldIcon';
import { authClient } from '@/app/lib/auth-client';
import { NAV_ITEMS, LOGO_TEXT } from '@/app/lib/constants';
import { useAuth } from '@/app/providers/AuthProvider';

interface HeaderProps {
    readonly title?: string;
}

const NAV_ICONS: Record<string, string> = {
    'Meu Painel': 'grid_view',
    'Vagas para Você': 'work_outline',
    'Teste suas Skills': 'psychology',
    'Jornada do aluno': 'route',
    'Radar de Mercado': 'bar_chart',
    'Meu Perfil': 'person_outline',
    'Feedbacks de melhorias': 'feedback',
};

function getOnboardingNavId(href: string) {
    const anchorMap: Record<string, string> = {
        '/jobs': 'nav-vagas',
        '/assessments': 'nav-assessments',
        '/analytics': 'nav-analytics',
        '/jornada': 'nav-jornada',
    };

    return anchorMap[href];
}

function getInitials(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
}

async function clearClientAuthState() {
    if (globalThis.window === undefined) {
        return;
    }

    try {
        sessionStorage.clear();
    } catch {
        // noop
    }

    try {
        localStorage.removeItem('better-auth');
        localStorage.removeItem('better-auth.session');
    } catch {
        // noop
    }

    if ('caches' in globalThis.window) {
        const keys = await globalThis.window.caches.keys();
        await Promise.all(keys.map((key) => globalThis.window.caches.delete(key)));
    }
}

export default function Header({ title = 'Meu Painel' }: Readonly<HeaderProps>) {
    const { user } = useAuth();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fecha ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fecha ao mudar de rota
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await authClient.signOut();
        } finally {
            await clearClientAuthState();
            globalThis.window.location.replace('/login');
        }
    }

    return (
        <>
            <InitialOnboardingModal />
            <header className="bg-white dark:bg-surface-dark border-b border-border-light dark:border-border-dark h-16 flex items-center justify-between px-6 shrink-0">
            {/* Logo — visível apenas em mobile/tablet (sidebar oculta abaixo de lg) */}
            <div className="flex items-center gap-3 lg:hidden">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                    <ScudoShieldIcon className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="font-bold text-sm text-white tracking-tight">
                    {LOGO_TEXT.main}
                    <span className="text-primary">{LOGO_TEXT.accent}</span>
                </span>
            </div>

            <h1 className="hidden lg:block text-xl font-bold text-white tracking-tight">{title}</h1>

            {/* Avatar + dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={open}
                    onClick={() => setOpen((prev) => !prev)}
                    className="cursor-pointer focus:outline-none"
                >
                    {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            alt={`${user.name} Avatar`}
                            className="h-9 w-9 rounded-xl object-cover ring-2 ring-primary/30 hover:ring-primary transition-all duration-150"
                            src={user.avatar}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="h-9 w-9 rounded-xl bg-primary/20 border-2 border-primary/30 hover:border-primary flex items-center justify-center transition-all duration-150">
                            <span className="text-sm font-bold text-primary">{getInitials(user.name)}</span>
                        </div>
                    )}
                </button>

                {open && (
                    <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                        {/* Cabeçalho do menu */}
                        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
                            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-300 truncate mt-0.5">{user.email}</p>
                        </div>

                        {/* Navegação — visível apenas em mobile/tablet */}
                        <nav className="lg:hidden py-1.5 border-b border-border-light dark:border-border-dark">
                            <p className="px-4 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-400">
                                Navegação
                            </p>
                            {NAV_ITEMS.map((item) => {
                                const isActive = item.href === '/'
                                    ? pathname === '/'
                                    : pathname.startsWith(item.href);
                                const icon = NAV_ICONS[item.label] ?? item.icon;

                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        data-onboarding-id={getOnboardingNavId(item.href)}
                                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${isActive
                                            ? 'text-primary bg-primary/15'
                                            : 'text-slate-300 hover:bg-primary/10 hover:text-primary'
                                            }`}
                                    >
                                        <span
                                            className="material-symbols-outlined text-[18px] shrink-0"
                                            style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                                        >
                                            {icon}
                                        </span>
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Ações */}
                        <div className="py-1.5">
                            <button
                                type="button"
                                disabled={loggingOut}
                                onClick={() => void handleLogout()}
                                className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[18px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    logout
                                </span>
                                {loggingOut ? 'Saindo...' : 'Sair da conta'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            </header>
        </>
    );
}
