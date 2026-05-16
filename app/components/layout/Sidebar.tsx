'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandLogo from '@/app/components/layout/BrandLogo';
import { NAV_ITEMS } from '@/app/lib/constants';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSidebar } from '@/app/providers/SidebarProvider';

const NAV_ICONS: Record<string, string> = {
    'Meu Painel': 'grid_view',
    'Vagas Aptas para Você': 'work_outline',
    Avaliações: 'psychology',
    'Jornada do aluno': 'route',
    'Radar de Mercado': 'bar_chart',
    'Meu Perfil': 'person_outline',
    'Feedbacks de melhorias': 'feedback',
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

export default function Sidebar() {
    const { user } = useAuth();
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const visibleNavItems = NAV_ITEMS;

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-surface-dark border-r border-border-light dark:border-border-dark shrink-0 hidden lg:flex flex-col transition-[width] duration-200`}>
            {/* Logo */}
            <div className={`h-16 flex items-center border-b border-border-light dark:border-border-dark gap-3 ${isCollapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
                <Link href="/" aria-label="Ir para o início">
                    <BrandLogo logoClassName="h-7 w-auto" titleClassName={isCollapsed ? 'hidden' : 'h-4 w-auto'} />
                </Link>

                <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                    title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                    className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light/80 dark:border-border-dark text-slate-400 hover:text-white hover:border-violet-400/40 transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        {isCollapsed ? 'chevron_right' : 'chevron_left'}
                    </span>
                </button>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 py-5 flex flex-col justify-between ${isCollapsed ? 'px-2' : 'pl-3 pr-0'}`}>
                <div className="space-y-1">
                    {visibleNavItems.map((item) => {
                        const isActive = item.href === '/'
                            ? pathname === '/'
                            : pathname.startsWith(item.href);
                        const icon = NAV_ICONS[item.label] ?? item.icon;

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                data-onboarding-id={getOnboardingNavId(item.href)}
                                title={isCollapsed ? item.label : undefined}
                                className={`flex items-center gap-3 pl-3 pr-3 py-2.5 text-sm font-medium transition-all duration-150 group ${isActive
                                    ? 'rounded-l-lg bg-primary text-white border-r-2 border-primary'
                                    : 'rounded-lg text-slate-300 hover:bg-primary/10 hover:text-primary'
                                    } ${isCollapsed ? 'justify-center px-0 rounded-lg border-r-0' : ''}`}
                            >
                                <span
                                    className={`material-symbols-outlined text-xl shrink-0 transition-colors ${isActive ? 'text-white' : 'group-hover:text-violet-400'
                                        }`}
                                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                    {icon}
                                </span>
                                {isCollapsed ? null : <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </div>

            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-border-light dark:border-border-dark">
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            alt={`${user.name} Avatar`}
                            className="h-9 w-9 rounded-lg object-cover shrink-0"
                            src={user.avatar}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{getInitials(user.name)}</span>
                        </div>
                    )}
                    {isCollapsed ? null : (
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-300 truncate">{user.role}</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
