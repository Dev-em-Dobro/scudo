'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, LOGO_TEXT } from '@/app/lib/constants';
import { useAuth } from '@/app/providers/AuthProvider';

const NAV_ICONS: Record<string, string> = {
    Dashboard: 'grid_view',
    'Job Board': 'work_outline',
    'Skill Assessments': 'psychology',
    Analytics: 'bar_chart',
    Perfil: 'person_outline',
};

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

    return (
        <aside className="w-64 bg-white dark:bg-background-dark border-r border-border-light dark:border-border-dark shrink-0 hidden lg:flex flex-col">
            {/* Logo */}
            <div className="h-16 flex items-center px-5 border-b border-border-light dark:border-border-dark gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
                    <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                </div>
                <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                    {LOGO_TEXT.main}
                    <span className="text-primary">{LOGO_TEXT.accent}</span>
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 pl-3 pr-0 py-5 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = item.href === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.href);
                    const icon = NAV_ICONS[item.label] ?? item.icon;

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex items-center gap-3 pl-3 pr-3 py-2.5 text-sm font-medium transition-all duration-150 group ${isActive
                                ? 'rounded-l-lg bg-emerald-50 dark:bg-emerald-900/20 text-primary border-r-2 border-primary'
                                : 'rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-dark hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            <span
                                className={`material-symbols-outlined text-xl shrink-0 transition-colors ${isActive ? 'text-primary' : 'group-hover:text-slate-700 dark:group-hover:text-white'
                                    }`}
                                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                            >
                                {icon}
                            </span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center gap-3">
                    {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            alt={`${user.name} Avatar`}
                            className="h-9 w-9 rounded-lg object-cover"
                            src={user.avatar}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{getInitials(user.name)}</span>
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.role}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
