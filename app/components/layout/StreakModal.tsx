'use client';

import { useEffect, useMemo, useState } from 'react';

const STREAK_TIME_ZONE = 'America/Sao_Paulo';
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export type JornadaStreakBadgeDetails = {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string | null;
    requiredDays: number;
    isActive: boolean;
    earnedAt: string | null;
};

export type JornadaStreakDetails = {
    currentStreakDays: number;
    longestStreakDays: number;
    streakPoints: number;
    hasCompletedTaskToday: boolean;
    badges: JornadaStreakBadgeDetails[];
    nextBadge: {
        id: string;
        name: string;
        icon: string | null;
        requiredDays: number;
        daysRemaining: number;
    } | null;
};

export type JornadaStreakCalendar = {
    year: number;
    month: number;
    dayKeys: string[];
};

type StreakModalProps = {
    isOpen: boolean;
    onClose: () => void;
    streak: JornadaStreakDetails | null;
    calendar: JornadaStreakCalendar | null;
};

function getDatePart(parts: Intl.DateTimeFormatPart[], type: 'year' | 'month' | 'day') {
    return parts.find((part) => part.type === type)?.value ?? '';
}

function toDayKey(year: number, month: number, day: number) {
    const paddedMonth = String(month).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
}

function createMonthAnchorDate(year: number, month: number, day = 1) {
    // Usa meio-dia UTC para evitar voltar para o mês anterior ao formatar em UTC-3.
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function getMonthLabel(year: number, month: number) {
    return new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
        timeZone: STREAK_TIME_ZONE,
    }).format(createMonthAnchorDate(year, month));
}

function getTodayDayKeyInTimeZone(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: STREAK_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const year = getDatePart(parts, 'year');
    const month = getDatePart(parts, 'month');
    const day = getDatePart(parts, 'day');

    return `${year}-${month}-${day}`;
}

function isMaterialSymbolIcon(icon: string | null): icon is string {
    if (!icon) {
        return false;
    }

    return /^[a-z0-9_]+$/i.test(icon);
}

type StreakCalendarProps = {
    calendar: JornadaStreakCalendar | null;
    todayDayKey: string;
};

function StreakCalendar({ calendar, todayDayKey }: Readonly<StreakCalendarProps>) {
    if (!calendar) {
        return (
            <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2">
                <p className="text-sm text-amber-100">
                    Não foi possível carregar o calendário de streak deste mês agora.
                </p>
            </div>
        );
    }

    const monthLabel = getMonthLabel(calendar.year, calendar.month);
    const firstDayWeekday = createMonthAnchorDate(calendar.year, calendar.month).getUTCDay();
    const daysInMonth = new Date(Date.UTC(calendar.year, calendar.month, 0)).getUTCDate();
    const monthPrefix = `${calendar.year}-${String(calendar.month).padStart(2, '0')}-`;
    const streakDaySet = new Set(calendar.dayKeys.filter((dayKey) => dayKey.startsWith(monthPrefix)));

    const leadingEmptyCells = Array.from({ length: firstDayWeekday }, (_, offset) => ({
        key: `empty-${calendar.year}-${calendar.month}-${offset + 1}`,
        day: null as number | null,
    }));

    const monthDayCells = Array.from({ length: daysInMonth }, (_, offset) => {
        const day = offset + 1;
        return {
            key: toDayKey(calendar.year, calendar.month, day),
            day,
        };
    });

    const calendarCells = [...leadingEmptyCells, ...monthDayCells];

    return (
        <div className="rounded-lg border border-orange-400/25 bg-orange-500/8 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-semibold text-orange-100 capitalize">{monthLabel}</p>
                <p className="text-[10px] sm:text-[11px] text-orange-100/75">
                    {streakDaySet.size} {streakDaySet.size === 1 ? 'dia com streak' : 'dias com streak'}
                </p>
            </div>

            <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Calendário de streak de ${monthLabel}`}>
                {WEEKDAY_LABELS.map((weekday) => (
                    <div
                        key={weekday}
                        className="text-center text-[9px] sm:text-[10px] font-semibold uppercase text-orange-100/70 py-1"
                        role="columnheader"
                    >
                        {weekday}
                    </div>
                ))}

                {calendarCells.map((cell) => {
                    if (cell.day === null) {
                        return (
                            <div
                                key={cell.key}
                                className="h-8 sm:h-10 rounded-md border border-transparent"
                                aria-hidden
                            />
                        );
                    }

                    const dayKey = toDayKey(calendar.year, calendar.month, cell.day);
                    const hasStreak = streakDaySet.has(dayKey);
                    const isToday = dayKey === todayDayKey;

                    return (
                        <div
                            key={cell.key}
                            role="gridcell"
                            aria-label={hasStreak ? `Dia ${cell.day} com streak` : `Dia ${cell.day} sem streak`}
                            className={`relative h-8 sm:h-10 rounded-md border px-1 ${hasStreak ? 'border-orange-300/60 bg-orange-500/25' : 'border-orange-500/20 bg-orange-950/30'} ${isToday ? 'ring-1 ring-emerald-400/70' : ''}`}
                        >
                            <span className="absolute left-1.5 top-1 text-[9px] sm:text-[10px] font-semibold text-white/90">
                                {cell.day}
                            </span>
                            {hasStreak ? (
                                <span className="absolute right-1 bottom-1 inline-flex items-center justify-center text-orange-200" aria-hidden>
                                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        local_fire_department
                                    </span>
                                </span>
                            ) : null}
                            {isToday ? <span className="sr-only">Hoje</span> : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function StreakModal({ isOpen, onClose, streak, calendar }: Readonly<StreakModalProps>) {
    const [isDailyNoticeDismissed, setIsDailyNoticeDismissed] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const streakBadges = useMemo(
        () => (streak ? [...streak.badges].sort((left, right) => left.requiredDays - right.requiredDays) : []),
        [streak],
    );

    const nextBadgeProgressPercent = useMemo(() => {
        if (!streak?.nextBadge) {
            return 100;
        }

        return Math.min(100, Math.max(0, Math.round((streak.currentStreakDays / streak.nextBadge.requiredDays) * 100)));
    }, [streak]);

    const todayDayKey = useMemo(() => getTodayDayKeyInTimeZone(), []);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-70 flex items-end sm:items-center justify-center p-3 sm:p-6">
            <button
                type="button"
                className="absolute inset-0 bg-black/65 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
                aria-label="Fechar modal de streak"
            />

            <dialog
                open
                aria-labelledby="streak-modal-title"
                className="relative z-10 flex w-full max-w-5xl max-h-[88dvh] sm:max-h-[92vh] flex-col overflow-hidden rounded-xl border border-orange-500/30 bg-background-dark shadow-2xl"
            >
                <div className="flex items-center justify-between gap-3 border-b border-orange-500/20 px-4 py-3 sm:px-5">
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-orange-200/90">
                            Sistema de streak diário
                        </p>
                        <h2 id="streak-modal-title" className="text-sm sm:text-lg font-bold text-white">
                            Progresso diário da Jornada
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md cursor-pointer text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Fechar modal de streak"
                    >
                        <span className="material-symbols-outlined text-base" aria-hidden>close</span>
                    </button>
                </div>

                <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
                    {streak ? (
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
                                <div className="w-full max-w-3xl space-y-1.5 sm:space-y-2">
                                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                                        Ganhe +1 ponto por dia ao concluir pelo menos 1 tarefa da jornada
                                    </h3>
                                    <p className="text-xs sm:text-sm text-orange-100/80 leading-snug">
                                        Cada dia concluído fortalece seu streak e libera badges em marcos como 7, 30, 60 e 100 dias.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full max-w-4xl">
                                    <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2">
                                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-orange-200/80">Streak atual</p>
                                        <p className="text-lg sm:text-xl font-bold text-white mt-1">{streak.currentStreakDays} dias</p>
                                    </div>
                                    <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2">
                                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-orange-200/80">Maior streak</p>
                                        <p className="text-lg sm:text-xl font-bold text-white mt-1">{streak.longestStreakDays} dias</p>
                                    </div>
                                    <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2 sm:col-span-2 lg:col-span-1">
                                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-orange-200/80">Pontos acumulados</p>
                                        <p className="text-lg sm:text-xl font-bold text-white mt-1">{streak.streakPoints} pontos</p>
                                    </div>
                                </div>
                            </div>

                            {isDailyNoticeDismissed ? null : (
                                <div className={`rounded-lg border px-3 py-2 ${streak.hasCompletedTaskToday ? 'border-emerald-500/40 bg-emerald-500/15' : 'border-amber-500/40 bg-amber-500/15'}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-xs sm:text-sm ${streak.hasCompletedTaskToday ? 'text-emerald-200' : 'text-amber-100'}`}>
                                            {streak.hasCompletedTaskToday
                                                ? 'Hoje você já garantiu seu ponto diário de streak.'
                                                : 'Hoje ainda não conta para o streak. Conclua 1 tarefa para ganhar +1 ponto.'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsDailyNoticeDismissed(true);
                                            }}
                                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md cursor-pointer text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                                            aria-label="Fechar mensagem diária de streak"
                                        >
                                            <span className="material-symbols-outlined text-sm" aria-hidden>close</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {streak.nextBadge ? (
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-orange-100/80">
                                        <span>Próxima badge: {streak.nextBadge.name}</span>
                                        <span>Faltam {streak.nextBadge.daysRemaining} dias</span>
                                    </div>
                                    <div className="h-2.5 rounded-full bg-orange-950/60 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-orange-400 transition-all duration-300"
                                            style={{ width: `${nextBadgeProgressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                                    <p className="text-xs sm:text-sm text-emerald-200">
                                        Todas as badges ativas de streak já foram conquistadas.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-orange-200/90">
                                    Calendário de streak
                                </p>
                                <StreakCalendar calendar={calendar} todayDayKey={todayDayKey} />
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-orange-200/90">
                                    Badges do streak
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {streakBadges.map((badge) => {
                                        const isEarned = badge.earnedAt !== null;

                                        return (
                                            <div
                                                key={badge.id}
                                                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] sm:text-[11px] ${isEarned ? 'border-emerald-400/45 bg-emerald-500/20 text-emerald-100' : 'border-orange-400/25 bg-orange-500/10 text-orange-100/80'}`}
                                                title={badge.description}
                                            >
                                                {isMaterialSymbolIcon(badge.icon) ? (
                                                    <span className="material-symbols-outlined text-[13px] sm:text-sm leading-none" aria-hidden>
                                                        {badge.icon}
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase">{badge.icon ?? 'badge'}</span>
                                                )}
                                                <span className="font-semibold">{badge.name}</span>
                                                <span className="opacity-80">{badge.requiredDays}d</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2">
                            <p className="text-xs sm:text-sm text-amber-100">
                                Não foi possível carregar os detalhes do streak agora. Tente novamente em instantes.
                            </p>
                        </div>
                    )}
                </div>
            </dialog>
        </div>
    );
}
