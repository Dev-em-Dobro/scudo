import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { auth } from '@/app/lib/auth';
import { isOfficialStudentUser } from '@/app/lib/jornada/service';
import { getUserStreakViewInTransaction } from '@/app/lib/jornada/streak';
import { withRlsUserContext } from '@/app/lib/rls';

export const runtime = 'nodejs';

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

    const streak = await withRlsUserContext(session.user.id, (transaction) => (
        getUserStreakViewInTransaction(transaction, session.user.id)
    ));

    return NextResponse.json({
        streak: {
            currentStreakDays: streak.currentStreakDays,
            hasCompletedTaskToday: streak.hasCompletedTaskToday,
        },
    });
}
