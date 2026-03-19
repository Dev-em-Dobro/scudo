import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import {
    getCatalogTaskById,
    getUserJornadaSnapshot,
    isOfficialStudentUser,
    isTaskEditableForUser,
    setTaskDoneForUser,
} from '@/app/lib/jornada/service';

export const runtime = 'nodejs';

const toggleTaskSchema = z.object({
    taskId: z.string().trim().min(1),
    done: z.boolean(),
}).strict();

export async function GET() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const isOfficialStudent = await isOfficialStudentUser(session.user.id);
    if (!isOfficialStudent) {
        return NextResponse.json({ error: 'A jornada está disponível apenas para alunos oficiais.' }, { status: 403 });
    }

    const snapshot = await getUserJornadaSnapshot(session.user.id);

    return NextResponse.json(snapshot);
}

export async function PATCH(request: Request) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const isOfficialStudent = await isOfficialStudentUser(session.user.id);
    if (!isOfficialStudent) {
        return NextResponse.json({ error: 'A jornada está disponível apenas para alunos oficiais.' }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = toggleTaskSchema.safeParse(rawBody);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Dados inválidos.', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const { taskId, done } = parsed.data;
    const task = getCatalogTaskById(taskId);

    if (!task) {
        return NextResponse.json({ error: 'Tarefa não encontrada.' }, { status: 404 });
    }

    if (!await isTaskEditableForUser(session.user.id, taskId)) {
        return NextResponse.json(
            { error: 'Somente tarefas do rank atual podem ser marcadas no momento.' },
            { status: 403 },
        );
    }

    await setTaskDoneForUser(session.user.id, taskId, done);

    const snapshot = await getUserJornadaSnapshot(session.user.id);

    return NextResponse.json(snapshot);
}
