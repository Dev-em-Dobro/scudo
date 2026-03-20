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
    const editableStageId = computeEditableStageId(stages, tasks);
    const currentStage = stages.find((stage) => stage.id === editableStageId);

    return currentStage?.rankLetter ?? 'I';
}

function computeLevel(stages: JornadaStage[], tasks: JornadaTask[], editableStageId: string) {
    const levelsPerStage = 5;
    const maxLevel = 50;
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    const allTasksDone = tasks.length > 0 && tasks.every((task) => task.status === 'done');

    if (allTasksDone) {
        return maxLevel;
    }

    const currentStageIndex = sortedStages.findIndex((stage) => stage.id === editableStageId);
    const completedStagesCount = Math.max(0, currentStageIndex);
    const baseLevel = 1 + (completedStagesCount * levelsPerStage);

    const currentStage = currentStageIndex >= 0 ? sortedStages[currentStageIndex] : null;
    if (!currentStage) {
        return Math.min(maxLevel - 1, baseLevel);
    }

    const currentStageTasks = tasks.filter((task) => task.stageId === currentStage.id);
    const completedCurrentStageTasks = currentStageTasks.filter((task) => task.status === 'done').length;
    const totalCurrentStageTasks = currentStageTasks.length;

    if (totalCurrentStageTasks === 0) {
        return Math.min(maxLevel - 1, baseLevel);
    }

    const progressWithinStage = completedCurrentStageTasks / totalCurrentStageTasks;
    const extraLevels = Math.floor(progressWithinStage * levelsPerStage);

    return Math.max(1, Math.min(maxLevel - 1, baseLevel + extraLevels));
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
    const editableStageId = computeEditableStageId(MOCK_STAGES, tasks);

    return {
        stages: MOCK_STAGES,
        tasks,
        completedTaskIds: [...completedTaskIds],
        currentRankLetter: computeCurrentRankLetter(MOCK_STAGES, tasks),
        level: computeLevel(MOCK_STAGES, tasks, editableStageId),
        editableStageId,
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
