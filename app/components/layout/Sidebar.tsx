'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandLogo from '@/app/components/layout/BrandLogo';
import { getVisibleNavItems } from '@/app/lib/constants';
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

export default function Sidebar() {
    const { user } = useAuth();
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const visibleNavItems = getVisibleNavItems();

    return (
        <aside
            className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#0d0d0d] border-r border-[#333] shrink-0 hidden lg:flex flex-col transition-[width] duration-200`}
        >
            {/* Logo */}
            <div
                className={`h-16 flex items-center border-b border-[#333] gap-3 ${isCollapsed ? 'justify-center px-3' : 'justify-between px-5'}`}
            >
                <Link href="/" aria-label="Ir para o início">
                    <BrandLogo logoClassName="h-7 w-auto" titleClassName={isCollapsed ? 'hidden' : 'h-4 w-auto'} />
                </Link>

                <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                    title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                    className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#333] text-white/50 hover:text-white hover:border-[#6528d3] transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        {isCollapsed ? 'chevron_right' : 'chevron_left'}
                    </span>
                </button>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 py-5 ${isCollapsed ? 'px-3' : 'px-3'}`}>
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
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-colors duration-200 group [font-family:'Ubuntu',Helvetica] ${
                                    isActive
                                        ? 'bg-[#6528d3] text-white'
                                        : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                                } ${isCollapsed ? 'justify-center' : ''}`}
                            >
                                <span
                                    className="material-symbols-outlined text-[20px] shrink-0"
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
            <div className="p-4 border-t border-[#333]">
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            alt={`${user.name} Avatar`}
                            className="h-10 w-10 rounded-lg object-cover shrink-0 border border-[#333]"
                            src={user.avatar}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="h-10 w-10 rounded-lg bg-[#6528d3] flex items-center justify-center shrink-0">
                            <span className="text-[13px] font-black text-white [font-family:'Ubuntu',Helvetica]">
                                {getInitials(user.name)}
                            </span>
                        </div>
                    )}
                    {isCollapsed ? null : (
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-white truncate [font-family:'Ubuntu',Helvetica]">
                                {user.name}
                            </p>
                            <p className="text-[11px] uppercase tracking-[1.5px] text-white/50 truncate [font-family:'Ubuntu',Helvetica]">
                                {user.role}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
