import type { JornadaStage, JornadaTask } from '@/app/types';

import type { RlsTransaction } from '@/app/lib/rls';

function groupTasksByStageId(tasks: JornadaTask[]): Map<string, JornadaTask[]> {
    const map = new Map<string, JornadaTask[]>();

    for (const task of tasks) {
        const list = map.get(task.stageId) ?? [];
        list.push(task);
        map.set(task.stageId, list);
    }

    return map;
}

function isStageFullyComplete(stageTasks: JornadaTask[], completedTaskIds: Set<string>) {
    if (stageTasks.length === 0) {
        return false;
    }

    return stageTasks.every((task) => completedTaskIds.has(task.id));
}

/**
 * Etapa concluída no snapshot congela o rank — novas tarefas não rebaixam o usuário.
 */
export function computeEditableStageId(
    stages: JornadaStage[],
    tasks: JornadaTask[],
    completedStageIds: Set<string>,
) {
    const tasksByStage = groupTasksByStageId(tasks);
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);

    for (const stage of sortedStages) {
        if (completedStageIds.has(stage.id)) {
            continue;
        }

        const stageTasks = tasksByStage.get(stage.id) ?? [];
        const hasPendingTask = stageTasks.some((task) => task.status !== 'done');

        if (hasPendingTask) {
            return stage.id;
        }
    }

    return sortedStages.at(-1)?.id ?? '';
}

export async function loadCompletedStageIds(
    transaction: RlsTransaction,
    userId: string,
): Promise<Set<string>> {
    const rows = await transaction.userJornadaStageCompletion.findMany({
        where: { userId },
        select: { stageId: true },
    });

    return new Set(rows.map((row) => row.stageId));
}

/**
 * Backfill idempotente: grava conclusão de etapa quando todas as tarefas atuais estão done.
 * Retorna os stageIds recém-concluídos nesta execução.
 */
export async function syncStageCompletions(
    transaction: RlsTransaction,
    userId: string,
    stages: JornadaStage[],
    catalogTasks: JornadaTask[],
    completedTaskIds: Set<string>,
    catalogVersion: number,
): Promise<{ completedStageIds: Set<string>; newlyCompletedStageIds: string[] }> {
    const completedStageIds = await loadCompletedStageIds(transaction, userId);
    const tasksByStage = groupTasksByStageId(catalogTasks);
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    const now = new Date();
    const newlyCompletedStageIds: string[] = [];

    for (const stage of sortedStages) {
        if (completedStageIds.has(stage.id)) {
            continue;
        }

        const stageTasks = tasksByStage.get(stage.id) ?? [];
        if (!isStageFullyComplete(stageTasks, completedTaskIds)) {
            continue;
        }

        await transaction.userJornadaStageCompletion.upsert({
            where: {
                userId_stageId: {
                    userId,
                    stageId: stage.id,
                },
            },
            update: {
                completedAt: now,
                catalogVersionAtCompletion: catalogVersion,
            },
            create: {
                userId,
                stageId: stage.id,
                completedAt: now,
                catalogVersionAtCompletion: catalogVersion,
            },
        });

        completedStageIds.add(stage.id);
        newlyCompletedStageIds.push(stage.id);
    }

    return { completedStageIds, newlyCompletedStageIds };
}
