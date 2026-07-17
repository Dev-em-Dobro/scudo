import { prisma } from '@/app/lib/prisma';
import type { JornadaStage, JornadaTask } from '@/app/types';

import { fetchCodeQuestProgressByEmail, type CodeQuestProgress } from '@/app/lib/codequest/service';
import {
    CODEQUEST_CATEGORY_TASK_IDS,
    getTaskIdsReadyToSyncFromCodeQuest,
} from '@/app/lib/jornada/codequestExerciseMap';
import {
    buildPraticaTaskIds,
    getCatalogTaskByIdFromTasks,
    getPublishedJornadaCatalog,
    type PublishedJornadaCatalog,
} from '@/app/lib/jornada/catalog';
import {
    computeEditableStageId,
    loadCompletedStageIds,
    syncStageCompletions,
} from '@/app/lib/jornada/stageCompletion';
import { scheduleGeneratedResumePdfGeneration } from '@/app/lib/resume/schedulePdfGeneration';
import { syncGeneratedResumeForUser } from '@/app/lib/resume/syncGeneratedResume';
import type { GeneratedResumeMeta } from '@/app/lib/resume/types';
import {
    awardDailyStreakForTask,
    getUserStreakViewInTransaction,
    reconcileStreakFromUserTaskProgress,
    type DailyStreakAwardResult,
    type JornadaStreakBadgeView,
    type JornadaStreakView,
} from '@/app/lib/jornada/streak';
import { withRlsUserContext } from '@/app/lib/rls';

export type JornadaSnapshot = {
    stages: JornadaStage[];
    tasks: JornadaTask[];
    completedTaskIds: string[];
    completedStageIds: string[];
    currentRankLetter: string;
    editableStageId: string;
    codeQuestProgress: CodeQuestProgress | null;
    hasCodeQuestAccount: boolean;
    streak: JornadaStreakView;
    catalogSource: 'database' | 'code';
    catalogVersion: number;
    resumeUpdated?: GeneratedResumeMeta | null;
};

export type GetUserJornadaSnapshotOptions = {
    /** Consulta o banco do CodeQuest e sincroniza tarefas de exercício. Padrão: true. */
    includeCodeQuest?: boolean;
    /** Roda sync de estágios + currículo ao montar o snapshot. Padrão: true. */
    syncProgress?: boolean;
};

export type SetTaskDoneForUserResult = {
    taskId: string;
    done: boolean;
    editableStageId: string;
    currentRankLetter: string;
    streakAwardedToday: boolean;
    newlyUnlockedBadges: JornadaStreakBadgeView[];
    resumeUpdated: GeneratedResumeMeta | null;
};

function withPersistedStatuses(catalogTasks: JornadaTask[], completedTaskIds: Set<string>) {
    return catalogTasks.map((task) => ({
        ...task,
        status: completedTaskIds.has(task.id) ? 'done' : 'pending',
    })) satisfies JornadaTask[];
}

function computeCurrentRankLetter(stages: JornadaStage[], editableStageId: string) {
    const currentStage = stages.find((stage) => stage.id === editableStageId);

    return currentStage?.rankLetter ?? 'I';
}

function computeJornadaViewState(
    catalog: PublishedJornadaCatalog,
    completedTaskIds: Set<string>,
    completedStageIds: Set<string>,
) {
    const tasks = withPersistedStatuses(catalog.tasks, completedTaskIds);
    const editableStageId = computeEditableStageId(catalog.stages, tasks, completedStageIds);

    return {
        tasks,
        editableStageId,
        currentRankLetter: computeCurrentRankLetter(catalog.stages, editableStageId),
    };
}

async function maybeSyncGeneratedResumeAfterStageCompletion(
    transaction: Parameters<typeof syncGeneratedResumeForUser>[0]['transaction'],
    userId: string,
    stages: JornadaStage[],
    completedStageIds: Set<string>,
    newlyCompletedStageIds: string[],
    options?: { deferPdf?: boolean },
): Promise<GeneratedResumeMeta | null> {
    if (newlyCompletedStageIds.length === 0) {
        return null;
    }

    const user = await transaction.user.findUnique({
        where: { id: userId },
        select: {
            email: true,
            name: true,
        },
    });

    if (!user?.email) {
        return null;
    }

    const latestStageId = newlyCompletedStageIds.at(-1) ?? null;
    const latestStage = stages.find((stage) => stage.id === latestStageId) ?? null;

    return syncGeneratedResumeForUser({
        transaction,
        userId,
        userEmail: user.email,
        userName: user.name,
        completedStageIds,
        triggerStageId: latestStageId,
        rankName: latestStage?.rankLetter ?? latestStage?.title ?? null,
        deferPdf: options?.deferPdf,
    });
}

async function mapUnlockedBadges(
    transaction: Parameters<typeof awardDailyStreakForTask>[0],
    badgeIds: string[],
    earnedAt: Date,
): Promise<JornadaStreakBadgeView[]> {
    if (badgeIds.length === 0) {
        return [];
    }

    const unlockedBadges = await transaction.streakBadge.findMany({
        where: {
            id: {
                in: badgeIds,
            },
        },
        select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            icon: true,
            requiredDays: true,
            isActive: true,
        },
    });

    return unlockedBadges.map((badge) => ({
        id: badge.id,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        requiredDays: badge.requiredDays,
        isActive: badge.isActive,
        earnedAt: earnedAt.toISOString(),
    }));
}

export async function getCatalogTaskById(taskId: string) {
    const catalog = await getPublishedJornadaCatalog();
    return getCatalogTaskByIdFromTasks(catalog.tasks, taskId);
}

export function isPraticaTask(task: JornadaTask): boolean {
    if (task.kind) {
        return task.kind === 'pratica';
    }

    return task.title.toLowerCase().includes('exercício');
}

/**
 * Validação leve: não carrega snapshot completo nem consulta CodeQuest.
 */
export async function isTaskEditableForUser(userId: string, task: JornadaTask): Promise<boolean> {
    const catalog = await getPublishedJornadaCatalog();

    const { completedTaskIds, completedStageIds } = await withRlsUserContext(userId, async (transaction) => {
        const [progress, stageCompletions] = await Promise.all([
            transaction.userJornadaTaskProgress.findMany({
                where: { userId },
                select: { taskId: true },
            }),
            transaction.userJornadaStageCompletion.findMany({
                where: { userId },
                select: { stageId: true },
            }),
        ]);

        return {
            completedTaskIds: new Set(progress.map((item) => item.taskId)),
            completedStageIds: new Set(stageCompletions.map((item) => item.stageId)),
        };
    });

    const { editableStageId } = computeJornadaViewState(catalog, completedTaskIds, completedStageIds);

    if (task.stageId === editableStageId) {
        return true;
    }

    if (!completedStageIds.has(task.stageId)) {
        return false;
    }

    return !completedTaskIds.has(task.id);
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

export async function autoSyncPraticaTasksForUser(userId: string) {
    const catalog = await getPublishedJornadaCatalog();
    const praticaIds = [...buildPraticaTaskIds(catalog.tasks)];
    const existing = await withRlsUserContext(userId, async (transaction) => transaction.userJornadaTaskProgress.findMany({
        where: { userId },
        select: { taskId: true },
    }));
    const completedTaskIds = new Set(existing.map((e) => e.taskId));
    const missing = praticaIds.filter((id) => !completedTaskIds.has(id));

    if (missing.length === 0) {
        return;
    }

    const now = new Date();
    await withRlsUserContext(userId, async (transaction) => {
        await transaction.userJornadaTaskProgress.createMany({
            data: missing.map((taskId) => ({
                userId,
                taskId,
                completedAt: now,
            })),
            skipDuplicates: true,
        });

        await reconcileStreakFromUserTaskProgress(transaction, userId);
    });
}

async function autoSyncSpecificTasks(
    userId: string,
    taskIds: string[],
    completedTaskIds: Set<string>,
) {
    const missing = taskIds.filter((id) => !completedTaskIds.has(id));

    if (missing.length === 0) {
        return;
    }

    const now = new Date();
    await withRlsUserContext(userId, async (transaction) => {
        await transaction.userJornadaTaskProgress.createMany({
            data: missing.map((taskId) => ({
                userId,
                taskId,
                completedAt: now,
            })),
            skipDuplicates: true,
        });

        await reconcileStreakFromUserTaskProgress(transaction, userId);
    });

    for (const id of missing) {
        completedTaskIds.add(id);
    }
}

export async function getUserJornadaSnapshot(
    userId: string,
    options: GetUserJornadaSnapshotOptions = {},
): Promise<JornadaSnapshot> {
    const includeCodeQuest = options.includeCodeQuest ?? true;
    const syncProgress = options.syncProgress ?? true;
    const catalog = await getPublishedJornadaCatalog();

    const [rlsData, user] = await Promise.all([
        withRlsUserContext(userId, async (transaction) => {
            const progress = await transaction.userJornadaTaskProgress.findMany({
                where: { userId },
                select: { taskId: true },
            });

            return { progress };
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        }),
    ]);

    const completedTaskIds = new Set<string>(rlsData.progress.map((item) => item.taskId));
    const email = user?.email ?? null;

    let codeQuestProgress: CodeQuestProgress | null = null;

    if (includeCodeQuest && email) {
        codeQuestProgress = await fetchCodeQuestProgressByEmail(email);

        if (codeQuestProgress) {
            const exerciseTaskIds = getTaskIdsReadyToSyncFromCodeQuest(
                codeQuestProgress.completedExerciseIds,
            );
            if (exerciseTaskIds.length > 0) {
                await autoSyncSpecificTasks(userId, exerciseTaskIds, completedTaskIds);
            }

            for (const cat of codeQuestProgress.byCategory) {
                if (cat.total > 0 && cat.done >= cat.total) {
                    const taskIds = CODEQUEST_CATEGORY_TASK_IDS[cat.category] ?? [];
                    await autoSyncSpecificTasks(userId, taskIds, completedTaskIds);
                }
            }
        }
    }

    let resumeUpdated: GeneratedResumeMeta | null = null;
    let completedStageIds = await withRlsUserContext(userId, async (transaction) => loadCompletedStageIds(transaction, userId));

    if (syncProgress) {
        const syncResult = await withRlsUserContext(userId, async (transaction) => {
            const result = await syncStageCompletions(
                transaction,
                userId,
                catalog.stages,
                catalog.tasks,
                completedTaskIds,
                catalog.catalogVersion,
            );

            const updatedResume = await maybeSyncGeneratedResumeAfterStageCompletion(
                transaction,
                userId,
                catalog.stages,
                result.completedStageIds,
                result.newlyCompletedStageIds,
            );

            return {
                completedStageIds: result.completedStageIds,
                resumeUpdated: updatedResume,
            };
        });

        completedStageIds = syncResult.completedStageIds;
        resumeUpdated = syncResult.resumeUpdated;
    }

    const viewState = computeJornadaViewState(catalog, completedTaskIds, completedStageIds);

    // Recalcula streak a partir do progresso persistido (recupera dias de sync sem award).
    const streak = await withRlsUserContext(userId, async (transaction) => {
        await reconcileStreakFromUserTaskProgress(transaction, userId);
        return getUserStreakViewInTransaction(transaction, userId);
    });

    return {
        stages: catalog.stages,
        tasks: viewState.tasks,
        completedTaskIds: [...completedTaskIds],
        completedStageIds: [...completedStageIds],
        currentRankLetter: viewState.currentRankLetter,
        editableStageId: viewState.editableStageId,
        codeQuestProgress,
        hasCodeQuestAccount: codeQuestProgress !== null,
        streak,
        catalogSource: catalog.source,
        catalogVersion: catalog.catalogVersion,
        resumeUpdated,
    };
}

export async function setTaskDoneForUser(
    userId: string,
    taskId: string,
    done: boolean,
): Promise<SetTaskDoneForUserResult> {
    const catalog = await getPublishedJornadaCatalog();
    let streakResult: DailyStreakAwardResult = {
        awardedToday: false,
        newlyUnlockedBadgeIds: [],
    };
    let newlyUnlockedBadges: JornadaStreakBadgeView[] = [];
    let resumeUpdated: GeneratedResumeMeta | null = null;
    let shouldScheduleResumePdf = false;

    const result = await withRlsUserContext(userId, async (transaction) => {
        if (done) {
            const completedAt = new Date();

            await transaction.userJornadaTaskProgress.upsert({
                where: {
                    userId_taskId: {
                        userId,
                        taskId,
                    },
                },
                update: {
                    completedAt,
                },
                create: {
                    userId,
                    taskId,
                    completedAt,
                },
            });

            streakResult = await awardDailyStreakForTask(transaction, userId, completedAt);
            newlyUnlockedBadges = await mapUnlockedBadges(
                transaction,
                streakResult.newlyUnlockedBadgeIds,
                completedAt,
            );
        } else {
            await transaction.userJornadaTaskProgress.deleteMany({
                where: {
                    userId,
                    taskId,
                },
            });
        }

        const progress = await transaction.userJornadaTaskProgress.findMany({
            where: { userId },
            select: { taskId: true },
        });
        const completedTaskIds = new Set(progress.map((item) => item.taskId));

        const { completedStageIds, newlyCompletedStageIds } = await syncStageCompletions(
            transaction,
            userId,
            catalog.stages,
            catalog.tasks,
            completedTaskIds,
            catalog.catalogVersion,
        );

        if (done && newlyCompletedStageIds.length > 0) {
            resumeUpdated = await maybeSyncGeneratedResumeAfterStageCompletion(
                transaction,
                userId,
                catalog.stages,
                completedStageIds,
                newlyCompletedStageIds,
                { deferPdf: true },
            );
            shouldScheduleResumePdf = resumeUpdated !== null;
        }

        const viewState = computeJornadaViewState(catalog, completedTaskIds, completedStageIds);

        return viewState;
    });

    if (shouldScheduleResumePdf) {
        scheduleGeneratedResumePdfGeneration(userId);
    }

    return {
        taskId,
        done,
        editableStageId: result.editableStageId,
        currentRankLetter: result.currentRankLetter,
        streakAwardedToday: streakResult.awardedToday,
        newlyUnlockedBadges,
        resumeUpdated,
    };
}
