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
} from '@/app/lib/jornada/catalog';
import {
    computeEditableStageId,
    syncStageCompletions,
} from '@/app/lib/jornada/stageCompletion';
import { syncGeneratedResumeForUser } from '@/app/lib/resume/syncGeneratedResume';
import type { GeneratedResumeMeta } from '@/app/lib/resume/types';
import {
    awardDailyStreakForTask,
    getUserStreakViewInTransaction,
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

export type SetTaskDoneForUserResult = {
    streakAwardedToday: boolean;
    newlyUnlockedBadges: JornadaStreakBadgeView[];
    resumeUpdated?: GeneratedResumeMeta | null;
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

async function maybeSyncGeneratedResumeAfterStageCompletion(
    transaction: Parameters<typeof syncGeneratedResumeForUser>[0]['transaction'],
    userId: string,
    stages: JornadaStage[],
    completedStageIds: Set<string>,
    newlyCompletedStageIds: string[],
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
    });
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

export async function isTaskEditableForUser(userId: string, taskId: string) {
    const task = await getCatalogTaskById(taskId);
    if (!task) {
        return false;
    }

    const snapshot = await getUserJornadaSnapshot(userId);

    if (task.stageId === snapshot.editableStageId) {
        return true;
    }

    const completedStages = new Set(snapshot.completedStageIds);
    if (!completedStages.has(task.stageId)) {
        return false;
    }

    const taskState = snapshot.tasks.find((item) => item.id === taskId);
    return taskState?.status === 'pending';
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
    await withRlsUserContext(userId, async (transaction) => transaction.userJornadaTaskProgress.createMany({
        data: missing.map((taskId) => ({
            userId,
            taskId,
            completedAt: now,
        })),
        skipDuplicates: true,
    }));
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
    await withRlsUserContext(userId, async (transaction) => transaction.userJornadaTaskProgress.createMany({
        data: missing.map((taskId) => ({
            userId,
            taskId,
            completedAt: now,
        })),
        skipDuplicates: true,
    }));

    for (const id of missing) {
        completedTaskIds.add(id);
    }
}

export async function getUserJornadaSnapshot(userId: string): Promise<JornadaSnapshot> {
    const catalog = await getPublishedJornadaCatalog();

    const [rlsData, user] = await Promise.all([
        withRlsUserContext(userId, async (transaction) => {
            const progress = await transaction.userJornadaTaskProgress.findMany({
                where: { userId },
                select: { taskId: true },
            });
            const streak = await getUserStreakViewInTransaction(transaction, userId);

            return {
                progress,
                streak,
            };
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        }),
    ]);

    const completedTaskIds = new Set<string>(rlsData.progress.map((item) => item.taskId));
    const email = user?.email ?? null;

    let codeQuestProgress: CodeQuestProgress | null = null;

    if (email) {
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

    const { completedStageIds } = await withRlsUserContext(userId, async (transaction) => {
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

        resumeUpdated = updatedResume;
        return result;
    });

    const tasks = withPersistedStatuses(catalog.tasks, completedTaskIds);
    const editableStageId = computeEditableStageId(catalog.stages, tasks, completedStageIds);

    return {
        stages: catalog.stages,
        tasks,
        completedTaskIds: [...completedTaskIds],
        completedStageIds: [...completedStageIds],
        currentRankLetter: computeCurrentRankLetter(catalog.stages, editableStageId),
        editableStageId,
        codeQuestProgress,
        hasCodeQuestAccount: codeQuestProgress !== null,
        streak: rlsData.streak,
        catalogSource: catalog.source,
        catalogVersion: catalog.catalogVersion,
        resumeUpdated,
    };
}

export async function setTaskDoneForUser(userId: string, taskId: string, done: boolean): Promise<SetTaskDoneForUserResult> {
    if (done) {
        const completedAt = new Date();
        let streakResult: DailyStreakAwardResult = {
            awardedToday: false,
            newlyUnlockedBadgeIds: [],
        };
        let newlyUnlockedBadges: JornadaStreakBadgeView[] = [];
        let resumeUpdated: GeneratedResumeMeta | null = null;

        await withRlsUserContext(userId, async (transaction) => {
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

            if (streakResult.newlyUnlockedBadgeIds.length > 0) {
                const unlockedBadges = await transaction.streakBadge.findMany({
                    where: {
                        id: {
                            in: streakResult.newlyUnlockedBadgeIds,
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

                newlyUnlockedBadges = unlockedBadges.map((badge) => ({
                    id: badge.id,
                    slug: badge.slug,
                    name: badge.name,
                    description: badge.description,
                    icon: badge.icon,
                    requiredDays: badge.requiredDays,
                    isActive: badge.isActive,
                    earnedAt: completedAt.toISOString(),
                }));
            }
        });

        await withRlsUserContext(userId, async (transaction) => {
            const catalog = await getPublishedJornadaCatalog({ bypassCache: true });
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

            resumeUpdated = await maybeSyncGeneratedResumeAfterStageCompletion(
                transaction,
                userId,
                catalog.stages,
                completedStageIds,
                newlyCompletedStageIds,
            );
        });

        return {
            streakAwardedToday: streakResult.awardedToday,
            newlyUnlockedBadges,
            resumeUpdated,
        };
    }

    await withRlsUserContext(userId, async (transaction) => transaction.userJornadaTaskProgress.deleteMany({
        where: {
            userId,
            taskId,
        },
    }));

    return {
        streakAwardedToday: false,
        newlyUnlockedBadges: [],
        resumeUpdated: null,
    };
}
