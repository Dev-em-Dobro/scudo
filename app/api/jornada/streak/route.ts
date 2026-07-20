import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { auth } from '@/app/lib/auth';
import { isOfficialStudentUser } from '@/app/lib/jornada/service';
import {
    getUserStreakViewInTransaction,
    reconcileStreakFromUserTaskProgress,
} from '@/app/lib/jornada/streak';
import { withRlsUserContext } from '@/app/lib/rls';

export const runtime = 'nodejs';

const STREAK_TIME_ZONE = 'America/Sao_Paulo';

function getDatePart(parts: Intl.DateTimeFormatPart[], type: 'year' | 'month' | 'day') {
    return parts.find((part) => part.type === type)?.value ?? '';
}

function toDayKey(year: number, month: number, day: number) {
    const paddedMonth = String(month).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
}

function getCurrentMonthRange(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: STREAK_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const year = Number(getDatePart(parts, 'year'));
    const month = Number(getDatePart(parts, 'month'));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    return {
        year,
        month,
        startDayKey: toDayKey(year, month, 1),
        endDayKey: toDayKey(year, month, daysInMonth),
    };
}

export async function GET() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const isOfficialStudent = await isOfficialStudentUser(session.user.id);
    if (!isOfficialStudent) {
        return NextResponse.json(
            { error: 'A jornada está disponível apenas para alunos oficiais.' },
            { status: 403 },
        );
    }

    const currentMonth = getCurrentMonthRange();

    try {
        const { streak, calendarDayKeys } = await withRlsUserContext(session.user.id, async (transaction) => {
            await reconcileStreakFromUserTaskProgress(transaction, session.user.id);
            const streakView = await getUserStreakViewInTransaction(transaction, session.user.id);

            const dailyActivity = await transaction.userStreakDailyActivity.findMany({
                where: {
                    userId: session.user.id,
                    dayKey: {
                        gte: currentMonth.startDayKey,
                        lte: currentMonth.endDayKey,
                    },
                },
                orderBy: {
                    dayKey: 'asc',
                },
                select: {
                    dayKey: true,
                },
            });

            return {
                streak: streakView,
                calendarDayKeys: dailyActivity.map((item) => item.dayKey),
            };
        }, {
            maxWait: 10_000,
            timeout: 20_000,
        });

        return NextResponse.json({
            streak,
            calendar: {
                year: currentMonth.year,
                month: currentMonth.month,
                dayKeys: calendarDayKeys,
            },
        });
    } catch (error) {
        console.error('[jornada/streak] Falha ao carregar streak:', error);
        return NextResponse.json(
            { error: 'Não foi possível carregar o streak agora. Tente novamente em instantes.' },
            { status: 503 },
        );
    }
}
