import { prisma } from '@/app/lib/prisma';
import type { JornadaStage, JornadaTask } from '@/app/types';

import { MOCK_STAGES, MOCK_TASKS } from '@/app/lib/jornada/mockJornada';

const taskById = new Map<string, JornadaTask>(MOCK_TASKS.map((task) => [task.id, task]));

export type JornadaSnapshot = {
    stages: JornadaStage[];
    tasks: JornadaTask[];
    completedTaskIds: string[];
    currentRankLetter: string;
    level: number;
    editableStageId: string;
};

function withPersistedStatuses(completedTaskIds: Set<string>) {
    return MOCK_TASKS.map((task) => ({
        ...task,
        status: completedTaskIds.has(task.id) ? 'done' : 'pending',
    })) satisfies JornadaTask[];
}

function computeCurrentRankLetter(stages: JornadaStage[], tasks: JornadaTask[]) {
    const tasksByStage = new Map<string, JornadaTask[]>();

    for (const task of tasks) {
        const list = tasksByStage.get(task.stageId) ?? [];
        list.push(task);
        tasksByStage.set(task.stageId, list);
    }

    const sortedStages = [...stages].sort((a, b) => a.order - b.order);

    for (let i = sortedStages.length - 1; i >= 0; i--) {
        const stage = sortedStages[i];
        const stageTasks = tasksByStage.get(stage.id) ?? [];
        if (stageTasks.some((task) => task.status === 'done')) {
            return stage.rankLetter;
        }
    }

    return 'I';
}

function computeLevel(completedCount: number) {
    return 1 + Math.min(49, Math.floor(completedCount / 2));
}

function computeEditableStageId(stages: JornadaStage[], tasks: JornadaTask[]) {
    const tasksByStage = new Map<string, JornadaTask[]>();

    for (const task of tasks) {
        const list = tasksByStage.get(task.stageId) ?? [];
        list.push(task);
        tasksByStage.set(task.stageId, list);
    }

    const sortedStages = [...stages].sort((a, b) => a.order - b.order);

    for (const stage of sortedStages) {
        const stageTasks = tasksByStage.get(stage.id) ?? [];
        const hasPendingTask = stageTasks.some((task) => task.status !== 'done');

        if (hasPendingTask) {
            return stage.id;
        }
    }

    return sortedStages.at(-1)?.id ?? '';
}

export function getCatalogTaskById(taskId: string) {
    return taskById.get(taskId) ?? null;
}

export async function isTaskEditableForUser(userId: string, taskId: string) {
    const task = getCatalogTaskById(taskId);
    if (!task) {
        return false;
    }

    const snapshot = await getUserJornadaSnapshot(userId);

    return task.stageId === snapshot.editableStageId;
}

export async function isOfficialStudentUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            officialStudentVerifiedAt: true,
        },
    });

    return Boolean(user?.officialStudentVerifiedAt);
}

export async function getUserJornadaSnapshot(userId: string): Promise<JornadaSnapshot> {
    const progress = await prisma.userJornadaTaskProgress.findMany({
        where: { userId },
        select: { taskId: true },
    });

    const completedTaskIds = new Set<string>(progress.map((item) => item.taskId));
    const tasks = withPersistedStatuses(completedTaskIds);
    const completedCount = tasks.filter((task) => task.status === 'done').length;

    return {
        stages: MOCK_STAGES,
        tasks,
        completedTaskIds: [...completedTaskIds],
        currentRankLetter: computeCurrentRankLetter(MOCK_STAGES, tasks),
        level: computeLevel(completedCount),
        editableStageId: computeEditableStageId(MOCK_STAGES, tasks),
    };
}

export async function setTaskDoneForUser(userId: string, taskId: string, done: boolean) {
    if (done) {
        await prisma.userJornadaTaskProgress.upsert({
            where: {
                userId_taskId: {
                    userId,
                    taskId,
                },
            },
            update: {
                completedAt: new Date(),
            },
            create: {
                userId,
                taskId,
                completedAt: new Date(),
            },
        });
        return;
    }

    await prisma.userJornadaTaskProgress.deleteMany({
        where: {
            userId,
            taskId,
        },
    });
}
