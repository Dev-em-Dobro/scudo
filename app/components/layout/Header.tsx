'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import BrandLogo from '@/app/components/layout/BrandLogo';
import InitialOnboardingModal from '@/app/components/onboarding/InitialOnboardingModal';
import StreakModal, {
    type JornadaStreakCalendar,
    type JornadaStreakDetails,
} from '@/app/components/layout/StreakModal';
import { authClient } from '@/app/lib/auth-client';
import { getVisibleNavItems } from '@/app/lib/constants';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTutorial } from '@/app/providers/TutorialProvider';

interface HeaderProps {
    readonly title?: string;
}

type JornadaStreakSummaryResponse = {
    streak: JornadaStreakDetails;
    calendar?: JornadaStreakCalendar;
};

function getStreakInfoTitle(summary: JornadaStreakDetails | null) {
    if (!summary) {
        return 'Streak diário: conclua ao menos uma tarefa da jornada por dia para acumular pontos.';
    }

    const dayLabel = summary.currentStreakDays === 1 ? 'dia' : 'dias';
    const todayMessage = summary.hasCompletedTaskToday
        ? 'Você já pontuou hoje.'
        : 'Conclua uma tarefa da jornada hoje para manter a sequência.';

    return `Streak atual: ${summary.currentStreakDays} ${dayLabel}. ${todayMessage}`;
}

const NAV_ICONS: Record<string, string> = {
    'Meu Painel': 'grid_view',
    'Vagas Aptas para Você': 'work_outline',
    Avaliações: 'psychology',
    'Jornada do aluno': 'route',
    'Radar de Mercado': 'bar_chart',
    'Meu Perfil': 'person_outline',
    'Feedbacks de melhorias': 'feedback',
    'Indique e Ganhe': 'redeem',
};

function getOnboardingNavId(href: string) {
    const anchorMap: Record<string, string> = {
        '/jobs': 'nav-vagas',
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
    const { openTutorial } = useTutorial();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
    const [streakModalSessionId, setStreakModalSessionId] = useState(0);
    const [loggingOut, setLoggingOut] = useState(false);
    const [streakSummary, setStreakSummary] = useState<JornadaStreakDetails | null>(null);
    const [streakCalendar, setStreakCalendar] = useState<JornadaStreakCalendar | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const streakInfoTitle = getStreakInfoTitle(streakSummary);
    const streakDaysLabel = streakSummary ? `${streakSummary.currentStreakDays}d` : '--';

    const refreshStreakSummary = useCallback(async () => {
        if (!user.isOfficialStudent) {
            setStreakSummary(null);
            setStreakCalendar(null);
            setIsStreakModalOpen(false);
            return;
        }

        try {
            const response = await fetch('/api/jornada/streak', {
                method: 'GET',
                cache: 'no-store',
                credentials: 'include',
            });

            if (!response.ok) {
                setStreakSummary(null);
                setStreakCalendar(null);
                return;
            }

            const data = await response.json() as JornadaStreakSummaryResponse;
            setStreakSummary(data.streak);
            setStreakCalendar(data.calendar ?? null);
        } catch {
            setStreakSummary(null);
            setStreakCalendar(null);
        }
    }, [user.isOfficialStudent]);

    const openStreakModal = () => {
        setStreakModalSessionId((current) => current + 1);
        setIsStreakModalOpen(true);
        void refreshStreakSummary();
    };

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
        setMobileNavOpen(false);
        setIsStreakModalOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!mobileNavOpen) {
            return;
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setMobileNavOpen(false);
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [mobileNavOpen]);

    useEffect(() => {
        void refreshStreakSummary();
    }, [refreshStreakSummary]);

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
            <header aria-label={title} className="bg-[#1a1a1a] border-b border-[#333] h-16 flex items-center justify-between gap-3 px-4 sm:px-6 shrink-0 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1 lg:hidden">
                    <Link href="/" className="min-w-0 shrink" aria-label="Ir para o início">
                        <BrandLogo className="min-w-0" logoClassName="h-8 w-8 sm:h-9 sm:w-9" titleClassName="h-4 w-auto" />
                    </Link>
                </div>

                {/* Título agora vive só no corpo da página (HERO). Spacer mantém os controles à direita no desktop. */}
                <div className="hidden lg:block flex-1" aria-hidden="true" />

                {/* Mobile: hambúrguer no lugar do antigo atalho do tutorial | Desktop: tutorial em texto */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        className="lg:hidden shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-light/60 border-[#333] text-white/80 hover:text-white hover:border-[#6528d3] transition-colors cursor-pointer"
                        aria-label="Abrir menu"
                        aria-expanded={mobileNavOpen}
                        onClick={() => setMobileNavOpen(true)}
                    >
                        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                            menu
                        </span>
                    </button>

                    {user.isOfficialStudent ? (
                        <button
                            type="button"
                            onClick={openStreakModal}
                            className="hidden md:inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border-light/60 border-[#333] px-3 text-white/80 hover:text-orange-300 hover:border-orange-400/40 transition-colors cursor-pointer"
                            aria-label="Abrir modal de streak diário"
                            title={`${streakInfoTitle} Clique para abrir os detalhes do streak.`}
                        >
                            <span className="material-symbols-outlined text-[18px] text-orange-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                                local_fire_department
                            </span>
                            <span className="text-xs font-semibold whitespace-nowrap tabular-nums">
                                {streakDaysLabel}
                            </span>
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={openTutorial}
                        aria-label="Assistir tutorial"
                        title="Assistir tutorial"
                        className="hidden lg:inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border-light/60 border-[#333] px-3 text-white/80 hover:text-[#a78bfa] hover:border-[#6528d3] transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                            play_circle
                        </span>
                        <span className="text-xs font-medium whitespace-nowrap">Assistir tutorial</span>
                    </button>

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
                                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/30 hover:border-emerald-500 flex items-center justify-center transition-all duration-150">
                                    <span className="text-sm font-bold text-emerald-400">{getInitials(user.name)}</span>
                                </div>
                            )}
                        </button>

                        {open && (
                            <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-[#333] bg-[#1a1a1a] shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                                {/* Cabeçalho do menu */}
                                <div className="px-4 py-3 border-b border-[#333]">
                                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                                    <p className="text-xs text-white/70 dark:text-white/80 truncate mt-0.5">{user.email}</p>
                                </div>

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
                </div>
            </header>

            {/* Drawer de navegação — mobile / tablet */}
            {mobileNavOpen ? (
                <div className="lg:hidden fixed inset-0 z-60">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
                        aria-label="Fechar menu"
                        onClick={() => setMobileNavOpen(false)}
                    />
                    <nav
                        className="absolute left-0 top-0 bottom-0 w-[min(20rem,92vw)] bg-[#1a1a1a] border-r border-[#333] shadow-2xl flex flex-col"
                        aria-label="Menu principal"
                    >
                        <div className="flex items-center justify-between h-16 px-4 border-b border-[#333] shrink-0">
                            <span className="text-sm font-bold text-white tracking-tight">Menu</span>
                            <button
                                type="button"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
                                aria-label="Fechar menu"
                                onClick={() => setMobileNavOpen(false)}
                            >
                                <span className="material-symbols-outlined text-[22px]">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-2">
                            {getVisibleNavItems().map((item) => {
                                const isActive =
                                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                                const icon = NAV_ICONS[item.label] ?? item.icon;

                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        data-onboarding-id={getOnboardingNavId(item.href)}
                                        onClick={() => setMobileNavOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isActive
                                            ? 'text-[#a78bfa] bg-[#6528d3]/15 border-l-2 border-[#6528d3]'
                                            : 'text-white/80 hover:bg-[#6528d3]/10 hover:text-[#a78bfa] border-l-2 border-transparent'
                                            }`}
                                    >
                                        <span
                                            className="material-symbols-outlined text-[20px] shrink-0"
                                            style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                                        >
                                            {icon}
                                        </span>
                                        {item.label}
                                    </Link>
                                );
                            })}
                            {user.isOfficialStudent ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileNavOpen(false);
                                        openStreakModal();
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white/80 hover:bg-[#6528d3]/10 hover:text-[#a78bfa] border-l-2 border-transparent transition-colors"
                                >
                                    <span
                                        className="material-symbols-outlined text-[20px] shrink-0 text-orange-400"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                        local_fire_department
                                    </span>
                                    <span>
                                        Streak diário {streakSummary ? `(${streakSummary.currentStreakDays}d)` : ''}
                                    </span>
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileNavOpen(false);
                                    openTutorial();
                                }}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white/80 hover:bg-[#6528d3]/10 hover:text-[#a78bfa] border-l-2 border-transparent transition-colors"
                            >
                                <span
                                    className="material-symbols-outlined text-[20px] shrink-0 text-[#a78bfa]"
                                    style={{ fontVariationSettings: "'FILL' 0" }}
                                >
                                    smart_display
                                </span>
                                <span>Assistir tutorial</span>
                            </button>
                        </div>
                    </nav>
                </div>
            ) : null}

            <StreakModal
                key={streakModalSessionId}
                isOpen={isStreakModalOpen}
                onClose={() => setIsStreakModalOpen(false)}
                streak={streakSummary}
                calendar={streakCalendar}
            />
        </>
    );
}
