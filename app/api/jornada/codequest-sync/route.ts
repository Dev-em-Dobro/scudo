import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { auth } from '@/app/lib/auth';
import {
    autoSyncPraticaTasksForUser,
    isOfficialStudentUser,
    getUserJornadaSnapshot,
} from '@/app/lib/jornada/service';

export const runtime = 'nodejs';

export async function POST() {
    try {
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const isOfficialStudent = await isOfficialStudentUser(session.user.id);
        if (!isOfficialStudent) {
            return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
        }

        const snapshot = await getUserJornadaSnapshot(session.user.id);

        if (snapshot.codeQuestProgress?.allDone) {
            await autoSyncPraticaTasksForUser(session.user.id);
        }

        return NextResponse.json({
            codeQuestProgress: snapshot.codeQuestProgress,
            hasCodeQuestAccount: snapshot.hasCodeQuestAccount,
            tasks: snapshot.tasks,
            completedTaskIds: snapshot.completedTaskIds,
            editableStageId: snapshot.editableStageId,
            currentRankLetter: snapshot.currentRankLetter,
        });
    } catch (error) {
        console.error('Falha ao sincronizar progresso CodeQuest.', error);
        return NextResponse.json({ error: 'Erro interno ao sincronizar progresso.' }, { status: 500 });
    }
}
