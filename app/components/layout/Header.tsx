'use client';

import { useAuth } from '@/app/providers/AuthProvider';

interface HeaderProps {
    readonly title?: string;
}

function getInitials(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
}

export default function Header({ title = 'Overview' }: Readonly<HeaderProps>) {
    const { user } = useAuth();

    return (
        <header className="bg-white dark:bg-background-dark border-b border-border-light dark:border-border-dark h-16 flex items-center justify-between px-6 shrink-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>

            <div className="flex items-center gap-2">
                {/* Notifications */}
                <button
                    type="button"
                    className="relative p-2 rounded-lg text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-dark transition-all duration-150"
                    aria-label="Notificações"
                >
                    <span className="material-symbols-outlined text-xl">notifications</span>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-background-dark" />
                </button>

                {/* Settings */}
                <button
                    type="button"
                    className="p-2 rounded-lg text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-dark transition-all duration-150"
                    aria-label="Configurações"
                >
                    <span className="material-symbols-outlined text-xl">settings</span>
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-border-light dark:bg-border-dark mx-1" />

                {/* Avatar */}
                {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        alt={`${user.name} Avatar`}
                        className="h-9 w-9 rounded-xl object-cover ring-2 ring-primary/30 cursor-pointer hover:ring-primary transition-all duration-150"
                        src={user.avatar}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="h-9 w-9 rounded-xl bg-primary/20 border-2 border-primary/30 hover:border-primary flex items-center justify-center cursor-pointer transition-all duration-150">
                        <span className="text-sm font-bold text-primary">{getInitials(user.name)}</span>
                    </div>
                )}
            </div>
        </header>
    );
}
