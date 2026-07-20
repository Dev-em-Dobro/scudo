import type { RlsTransaction } from '@/app/lib/rls';

const STREAK_TIME_ZONE = 'America/Sao_Paulo';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type BadgeDefinitionRecord = {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string | null;
    requiredDays: number;
    sortOrder: number;
    isActive: boolean;
};

type UserBadgeRecord = {
    badgeId: string;
    awardedAt: Date;
};

export type JornadaStreakBadgeView = {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string | null;
    requiredDays: number;
    isActive: boolean;
    earnedAt: string | null;
};

export type JornadaStreakNextBadgeView = {
    id: string;
    name: string;
    icon: string | null;
    requiredDays: number;
    daysRemaining: number;
};

export type JornadaStreakView = {
    currentStreakDays: number;
    longestStreakDays: number;
    streakPoints: number;
    hasCompletedTaskToday: boolean;
    badges: JornadaStreakBadgeView[];
    nextBadge: JornadaStreakNextBadgeView | null;
};

export type DailyStreakAwardResult = {
    awardedToday: boolean;
    newlyUnlockedBadgeIds: string[];
};

function parseDayKey(dayKey: string): Date | null {
    const [yearText, monthText, dayText] = dayKey.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    return new Date(Date.UTC(year, month - 1, day));
}

function diffDayKeys(previousDayKey: string, currentDayKey: string): number {
    const previousDate = parseDayKey(previousDayKey);
    const currentDate = parseDayKey(currentDayKey);

    if (!previousDate || !currentDate) {
        return 0;
    }

    return Math.floor((currentDate.getTime() - previousDate.getTime()) / DAY_IN_MS);
}

function toDayKeyFromUtcDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function shiftDayKey(dayKey: string, deltaDays: number): string | null {
    const date = parseDayKey(dayKey);
    if (!date) {
        return null;
    }

    date.setUTCDate(date.getUTCDate() + deltaDays);
    return toDayKeyFromUtcDate(date);
}

function computeLongestConsecutiveDays(sortedDayKeys: string[]): number {
    if (sortedDayKeys.length === 0) {
        return 0;
    }

    let longest = 1;
    let current = 1;

    for (let index = 1; index < sortedDayKeys.length; index += 1) {
        const gap = diffDayKeys(sortedDayKeys[index - 1]!, sortedDayKeys[index]!);
        if (gap === 1) {
            current += 1;
            longest = Math.max(longest, current);
            continue;
        }

        current = 1;
    }

    return longest;
}

function computeConsecutiveDaysEndingAt(sortedDayKeys: string[], endDayKey: string): number {
    const dayKeySet = new Set(sortedDayKeys);
    if (!dayKeySet.has(endDayKey)) {
        return 0;
    }

    let count = 0;
    let cursor: string | null = endDayKey;

    while (cursor && dayKeySet.has(cursor)) {
        count += 1;
        cursor = shiftDayKey(cursor, -1);
    }

    return count;
}

/**
 * Streak ainda "vivo" se o último dia qualificado foi hoje ou ontem (America/Sao_Paulo).
 */
export function getEffectiveCurrentStreakDays(
    currentStreakDays: number,
    lastQualifiedDay: string | null,
    todayDayKey = toStreakDayKey(new Date()),
): number {
    if (!lastQualifiedDay || currentStreakDays <= 0) {
        return 0;
    }

    const gapFromLastQualified = diffDayKeys(lastQualifiedDay, todayDayKey);
    if (gapFromLastQualified < 0 || gapFromLastQualified > 1) {
        return 0;
    }

    return currentStreakDays;
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: 'year' | 'month' | 'day') {
    return parts.find((part) => part.type === type)?.value ?? '';
}

export function toStreakDayKey(date: Date): string {
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

async function unlockEligibleBadges(
    transaction: RlsTransaction,
    userId: string,
    currentStreakDays: number,
    awardedAt: Date,
): Promise<string[]> {
    const eligibleBadges = await transaction.streakBadge.findMany({
        where: {
            isActive: true,
            requiredDays: {
                lte: currentStreakDays,
            },
        },
        select: {
            id: true,
        },
    });

    if (eligibleBadges.length === 0) {
        return [];
    }

    const eligibleBadgeIds = eligibleBadges.map((badge) => badge.id);
    const existingUnlocks = await transaction.userStreakBadge.findMany({
        where: {
            userId,
            badgeId: {
                in: eligibleBadgeIds,
            },
        },
        select: {
            badgeId: true,
        },
    });

    const unlockedBadgeIds = new Set(existingUnlocks.map((unlock) => unlock.badgeId));
    const pendingBadgeIds = eligibleBadgeIds.filter((badgeId) => !unlockedBadgeIds.has(badgeId));

    if (pendingBadgeIds.length === 0) {
        return [];
    }

    await transaction.userStreakBadge.createMany({
        data: pendingBadgeIds.map((badgeId) => ({
            userId,
            badgeId,
            awardedAt,
        })),
        skipDuplicates: true,
    });

    return pendingBadgeIds;
}

export async function awardDailyStreakForTask(
    transaction: RlsTransaction,
    userId: string,
    completedAt: Date,
): Promise<DailyStreakAwardResult> {
    const completionDayKey = toStreakDayKey(completedAt);
    const existingStreak = await transaction.userStreak.findUnique({
        where: {
            userId,
        },
        select: {
            id: true,
            currentStreakDays: true,
            longestStreakDays: true,
            streakPoints: true,
            lastQualifiedDay: true,
            lastTaskCompletedAt: true,
        },
    });

    const createdDailyActivity = await transaction.userStreakDailyActivity.createMany({
        data: [
            {
                userId,
                dayKey: completionDayKey,
                completedAt,
            },
        ],
        skipDuplicates: true,
    });

    if (createdDailyActivity.count === 0) {
        await transaction.userStreakDailyActivity.updateMany({
            where: {
                userId,
                dayKey: completionDayKey,
                completedAt: {
                    lt: completedAt,
                },
            },
            data: {
                completedAt,
            },
        });

        if (existingStreak) {
            const shouldUpdateLatestTaskTime =
                existingStreak.lastTaskCompletedAt === null
                || existingStreak.lastTaskCompletedAt.getTime() < completedAt.getTime();

            if (shouldUpdateLatestTaskTime) {
                await transaction.userStreak.update({
                    where: {
                        userId,
                    },
                    data: {
                        lastTaskCompletedAt: completedAt,
                    },
                });
            }
        }

        return {
            awardedToday: false,
            newlyUnlockedBadgeIds: [],
        };
    }

    if (!existingStreak) {
        await transaction.userStreak.create({
            data: {
                userId,
                currentStreakDays: 1,
                longestStreakDays: 1,
                streakPoints: 1,
                lastQualifiedDay: completionDayKey,
                lastTaskCompletedAt: completedAt,
            },
        });

        const newlyUnlockedBadgeIds = await unlockEligibleBadges(transaction, userId, 1, completedAt);

        return {
            awardedToday: true,
            newlyUnlockedBadgeIds,
        };
    }

    if (existingStreak.lastQualifiedDay === completionDayKey) {
        const shouldUpdateLatestTaskTime =
            existingStreak.lastTaskCompletedAt === null
            || existingStreak.lastTaskCompletedAt.getTime() < completedAt.getTime();

        if (shouldUpdateLatestTaskTime) {
            await transaction.userStreak.update({
                where: {
                    userId,
                },
                data: {
                    lastTaskCompletedAt: completedAt,
                },
            });
        }

        return {
            awardedToday: false,
            newlyUnlockedBadgeIds: [],
        };
    }

    if (existingStreak.lastQualifiedDay) {
        const dayGap = diffDayKeys(existingStreak.lastQualifiedDay, completionDayKey);

        if (dayGap <= 0) {
            return {
                awardedToday: false,
                newlyUnlockedBadgeIds: [],
            };
        }

        const nextCurrentStreakDays = dayGap === 1 ? existingStreak.currentStreakDays + 1 : 1;
        const nextLongestStreakDays = Math.max(existingStreak.longestStreakDays, nextCurrentStreakDays);

        await transaction.userStreak.update({
            where: {
                userId,
            },
            data: {
                currentStreakDays: nextCurrentStreakDays,
                longestStreakDays: nextLongestStreakDays,
                streakPoints: {
                    increment: 1,
                },
                lastQualifiedDay: completionDayKey,
                lastTaskCompletedAt: completedAt,
            },
        });

        const newlyUnlockedBadgeIds = await unlockEligibleBadges(
            transaction,
            userId,
            nextCurrentStreakDays,
            completedAt,
        );

        return {
            awardedToday: true,
            newlyUnlockedBadgeIds,
        };
    }

    await transaction.userStreak.update({
        where: {
            userId,
        },
        data: {
            currentStreakDays: 1,
            longestStreakDays: Math.max(existingStreak.longestStreakDays, 1),
            streakPoints: {
                increment: 1,
            },
            lastQualifiedDay: completionDayKey,
            lastTaskCompletedAt: completedAt,
        },
    });

    const newlyUnlockedBadgeIds = await unlockEligibleBadges(transaction, userId, 1, completedAt);

    return {
        awardedToday: true,
        newlyUnlockedBadgeIds,
    };
}

export type ReconcileStreakResult = {
    newlyQualifiedDayKeys: string[];
    currentStreakDays: number;
    longestStreakDays: number;
    streakPoints: number;
    newlyUnlockedBadgeIds: string[];
};

/**
 * Garante atividade diária para cada data de conclusão e recalcula o streak
 * a partir do calendário completo (idempotente). Usado pelos syncs e para
 * recuperar dias que já estavam em userJornadaTaskProgress sem streak.
 *
 * Importante: não faz update por dia (N+1) — isso estourava o timeout da
 * transação interativa (P2028) em alunos com muitos dias de progresso.
 */
export async function reconcileStreakFromCompletionDates(
    transaction: RlsTransaction,
    userId: string,
    completionDates: Date[],
): Promise<ReconcileStreakResult> {
    const todayDayKey = toStreakDayKey(new Date());
    const bestCompletedAtByDay = new Map<string, Date>();

    for (const completedAt of completionDates) {
        if (Number.isNaN(completedAt.getTime())) {
            continue;
        }

        const dayKey = toStreakDayKey(completedAt);
        const previous = bestCompletedAtByDay.get(dayKey);
        if (!previous || completedAt.getTime() < previous.getTime()) {
            bestCompletedAtByDay.set(dayKey, completedAt);
        }
    }

    const existingActivities = await transaction.userStreakDailyActivity.findMany({
        where: { userId },
        select: {
            dayKey: true,
            completedAt: true,
        },
    });

    const dayKeyToCompletedAt = new Map<string, Date>();
    for (const activity of existingActivities) {
        dayKeyToCompletedAt.set(activity.dayKey, activity.completedAt);
    }

    const newlyQualifiedDayKeys: string[] = [];
    const activitiesToCreate: Array<{ userId: string; dayKey: string; completedAt: Date }> = [];

    for (const [dayKey, completedAt] of bestCompletedAtByDay) {
        const existingCompletedAt = dayKeyToCompletedAt.get(dayKey);
        if (!existingCompletedAt) {
            newlyQualifiedDayKeys.push(dayKey);
            activitiesToCreate.push({ userId, dayKey, completedAt });
            dayKeyToCompletedAt.set(dayKey, completedAt);
            continue;
        }

        if (completedAt.getTime() < existingCompletedAt.getTime()) {
            dayKeyToCompletedAt.set(dayKey, completedAt);
        }
    }

    if (activitiesToCreate.length > 0) {
        await transaction.userStreakDailyActivity.createMany({
            data: activitiesToCreate,
            skipDuplicates: true,
        });
    }

    const sortedDayKeys = [...dayKeyToCompletedAt.keys()].sort();
    const streakPoints = sortedDayKeys.length;
    const longestFromHistory = computeLongestConsecutiveDays(sortedDayKeys);
    const lastQualifiedDay = sortedDayKeys.at(-1) ?? null;

    let currentStreakDays = 0;
    if (lastQualifiedDay) {
        const gapFromToday = diffDayKeys(lastQualifiedDay, todayDayKey);
        if (gapFromToday === 0 || gapFromToday === 1) {
            currentStreakDays = computeConsecutiveDaysEndingAt(sortedDayKeys, lastQualifiedDay);
        }
    }

    const longestStreakDays = Math.max(longestFromHistory, currentStreakDays);
    const lastTaskCompletedAt = [...dayKeyToCompletedAt.values()].reduce<Date | null>((latest, completedAt) => {
        if (!latest || completedAt.getTime() > latest.getTime()) {
            return completedAt;
        }
        return latest;
    }, null);

    if (streakPoints === 0) {
        return {
            newlyQualifiedDayKeys: [],
            currentStreakDays: 0,
            longestStreakDays: 0,
            streakPoints: 0,
            newlyUnlockedBadgeIds: [],
        };
    }

    const awardedAt = lastTaskCompletedAt ?? new Date();
    const existingStreak = await transaction.userStreak.findUnique({
        where: { userId },
        select: {
            id: true,
            currentStreakDays: true,
            longestStreakDays: true,
            streakPoints: true,
            lastQualifiedDay: true,
        },
    });

    const streakUnchanged = Boolean(
        existingStreak
        && existingStreak.currentStreakDays === currentStreakDays
        && existingStreak.longestStreakDays === longestStreakDays
        && existingStreak.streakPoints === streakPoints
        && existingStreak.lastQualifiedDay === lastQualifiedDay,
    );

    if (!existingStreak) {
        await transaction.userStreak.create({
            data: {
                userId,
                currentStreakDays,
                longestStreakDays,
                streakPoints,
                lastQualifiedDay,
                lastTaskCompletedAt,
            },
        });
    } else if (!streakUnchanged || newlyQualifiedDayKeys.length > 0) {
        await transaction.userStreak.update({
            where: { userId },
            data: {
                currentStreakDays,
                longestStreakDays,
                streakPoints,
                lastQualifiedDay,
                lastTaskCompletedAt,
            },
        });
    }

    const shouldUnlockBadges = newlyQualifiedDayKeys.length > 0 || !existingStreak;
    const newlyUnlockedBadgeIds = shouldUnlockBadges
        ? await unlockEligibleBadges(
            transaction,
            userId,
            Math.max(currentStreakDays, longestStreakDays),
            awardedAt,
        )
        : [];

    return {
        newlyQualifiedDayKeys,
        currentStreakDays,
        longestStreakDays,
        streakPoints,
        newlyUnlockedBadgeIds,
    };
}

export async function reconcileStreakFromUserTaskProgress(
    transaction: RlsTransaction,
    userId: string,
): Promise<ReconcileStreakResult> {
    const progress = await transaction.userJornadaTaskProgress.findMany({
        where: { userId },
        select: { completedAt: true },
    });

    return reconcileStreakFromCompletionDates(
        transaction,
        userId,
        progress.map((item) => item.completedAt),
    );
}

function toBadgeViews(
    badgeDefinitions: BadgeDefinitionRecord[],
    userBadges: UserBadgeRecord[],
): JornadaStreakBadgeView[] {
    const earnedBadgeById = new Map(userBadges.map((userBadge) => [userBadge.badgeId, userBadge.awardedAt]));
    const sortedBadgeDefinitions = [...badgeDefinitions].sort((left, right) => {
        if (left.requiredDays !== right.requiredDays) {
            return left.requiredDays - right.requiredDays;
        }

        return left.sortOrder - right.sortOrder;
    });

    return sortedBadgeDefinitions
        .map((badge) => {
            const earnedAt = earnedBadgeById.get(badge.id) ?? null;

            return {
                id: badge.id,
                slug: badge.slug,
                name: badge.name,
                description: badge.description,
                icon: badge.icon,
                requiredDays: badge.requiredDays,
                isActive: badge.isActive,
                earnedAt: earnedAt ? earnedAt.toISOString() : null,
            };
        })
        .filter((badge) => badge.isActive || badge.earnedAt !== null);
}

export async function getUserStreakViewInTransaction(
    transaction: RlsTransaction,
    userId: string,
): Promise<JornadaStreakView> {
    const todayDayKey = toStreakDayKey(new Date());

    const streak = await transaction.userStreak.findUnique({
        where: {
            userId,
        },
        select: {
            currentStreakDays: true,
            longestStreakDays: true,
            streakPoints: true,
            lastQualifiedDay: true,
        },
    });
    const badgeDefinitions = await transaction.streakBadge.findMany({
        select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            icon: true,
            requiredDays: true,
            sortOrder: true,
            isActive: true,
        },
    });
    const userBadges = await transaction.userStreakBadge.findMany({
        where: {
            userId,
        },
        select: {
            badgeId: true,
            awardedAt: true,
        },
    });

    const badges = toBadgeViews(badgeDefinitions, userBadges);
    const currentStreakDays = getEffectiveCurrentStreakDays(
        streak?.currentStreakDays ?? 0,
        streak?.lastQualifiedDay ?? null,
        todayDayKey,
    );
    const longestStreakDays = streak?.longestStreakDays ?? 0;
    const streakPoints = streak?.streakPoints ?? 0;

    const nextBadgeCandidate = badges.find((badge) => badge.isActive && badge.earnedAt === null);

    return {
        currentStreakDays,
        longestStreakDays,
        streakPoints,
        hasCompletedTaskToday: streak?.lastQualifiedDay === todayDayKey,
        badges,
        nextBadge: nextBadgeCandidate
            ? {
                id: nextBadgeCandidate.id,
                name: nextBadgeCandidate.name,
                icon: nextBadgeCandidate.icon,
                requiredDays: nextBadgeCandidate.requiredDays,
                daysRemaining: Math.max(0, nextBadgeCandidate.requiredDays - currentStreakDays),
            }
            : null,
    };
}
