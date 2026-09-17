import { prisma } from "@/app/lib/prisma";
import { getPublishedJornadaCatalog } from "@/app/lib/jornada/catalog";
import { resolveTaskIdFromClassId } from "@/app/lib/jornada/curseducaLessonTaskMap";
import { reconcileStreakFromUserTaskProgress } from "@/app/lib/jornada/streak";
import { withRlsUserContext } from "@/app/lib/rls";

type CurseducaProgressItem = {
    finishedAt?: string | null;
    lesson?: {
        id?: number | null;
    } | null;
};

type CurseducaMemberByEmail = {
    id: number;
    uuid: string;
};

type CurseducaMemberDetails = {
    slug?: string | null;
};

type CurseducaAuthConfig = {
    baseUrl: string;
    contentsBaseUrl: string;
    token: string;
    apiKey: string;
};

type MappedTaskCompletion = {
    taskId: string;
    completedAt: Date;
};

/** Inserts por transação — createMany é barato; mantém a tx curta. */
const CREATE_BATCH_SIZE = 100;
/** Updates paralelos por transação — evita N upserts sequenciais. */
const UPDATE_BATCH_SIZE = 25;
const UPDATE_CONCURRENCY = 8;

const TX_OPTIONS = {
    maxWait: 10_000,
    timeout: 20_000,
} as const;

function getCurseducaAuthConfig(): CurseducaAuthConfig {
    const baseUrl = process.env.CURSEDUCA_API_URL ?? process.env.USER_API_BASE_URL;
    const contentsBaseUrl = process.env.CURSEDUCA_CONTENTS_API_URL;
    const token = process.env.CURSEDUCA_API_TOKEN ?? process.env.AUTHORIZATION_TOKEN ?? "";
    const apiKey = process.env.CURSEDUCA_API_KEY ?? process.env.API_KEY_HEADER ?? "";

    if (!baseUrl || !contentsBaseUrl) {
        throw new Error("CURSEDUCA_API_URL e CURSEDUCA_CONTENTS_API_URL são obrigatórias.");
    }

    if (!token || !apiKey) {
        throw new Error("Credenciais da Curseduca ausentes.");
    }

    return { baseUrl, contentsBaseUrl, token, apiKey };
}

/** Evita registrar e-mail em query string nos logs do servidor. */
function redactUrlForLog(urlStr: string): string {
    try {
        const u = new URL(urlStr);
        if (u.searchParams.has("email")) {
            u.searchParams.set("email", "***");
        }
        return u.toString();
    } catch {
        return urlStr;
    }
}

function chunkArray<T>(items: T[], size: number): T[][] {
    if (items.length === 0) {
        return [];
    }

    const chunks: T[][] = [];
    for (let offset = 0; offset < items.length; offset += size) {
        chunks.push(items.slice(offset, offset + size));
    }
    return chunks;
}

async function mapWithConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>,
): Promise<void> {
    if (items.length === 0) {
        return;
    }

    let nextIndex = 0;

    async function runWorker() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            await worker(items[currentIndex]!);
        }
    }

    const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        () => runWorker(),
    );
    await Promise.all(workers);
}

async function fetchJsonOrThrow(url: string, auth?: CurseducaAuthConfig) {
    const { token, apiKey } = auth ?? getCurseducaAuthConfig();
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            api_key: apiKey,
            "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
        await response.text().catch(() => undefined);
        console.error("[curseduca-sync] HTTP", response.status, redactUrlForLog(url));
        throw new Error(`Falha na Curseduca (HTTP ${response.status}).`);
    }

    return response.json();
}

async function hydrateMemberSlugByEmail(userId: string, email: string, auth: CurseducaAuthConfig) {
    const { baseUrl } = auth;

    const byEmailUrl = `${baseUrl}/members/by?email=${encodeURIComponent(email)}`;
    const byEmailData = await fetchJsonOrThrow(byEmailUrl, auth) as CurseducaMemberByEmail;

    const memberDetailsUrl = `${baseUrl}/members/${byEmailData.id}`;
    const memberDetails = await fetchJsonOrThrow(memberDetailsUrl, auth) as CurseducaMemberDetails;

    const slug = memberDetails.slug?.trim() ?? "";
    if (!slug) {
        throw new Error("Membro da Curseduca sem slug.");
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            curseducaMemberId: byEmailData.id,
            curseducaMemberUuid: byEmailData.uuid,
            curseducaMemberSlug: slug,
        },
    });

    return { slug, curseducaMemberId: byEmailData.id };
}

/**
 * Resolve slug pelo memberId salvo no usuário.
 * Se o memberId não estiver salvo, busca por e-mail para hidratar id/slug.
 */
async function getMemberSlugForSync(userId: string, auth: CurseducaAuthConfig) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            curseducaMemberId: true,
        },
    });

    if (!user) {
        throw new Error("Usuário não encontrado.");
    }

    const { baseUrl } = auth;

    if (user.curseducaMemberId) {
        const memberDetailsUrl = `${baseUrl}/members/${user.curseducaMemberId}`;
        const memberDetails = await fetchJsonOrThrow(memberDetailsUrl, auth) as CurseducaMemberDetails;
        const slug = memberDetails.slug?.trim() ?? "";
        if (!slug) {
            throw new Error("Membro da Curseduca sem slug.");
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                curseducaMemberSlug: slug,
            },
        });

        return { slug, curseducaMemberId: user.curseducaMemberId };
    }

    const email = user.email?.trim().toLowerCase();
    if (!email) {
        throw new Error("Usuário sem e-mail para sincronizar com a Curseduca.");
    }

    return hydrateMemberSlugByEmail(user.id, email, auth);
}

/** Uma linha por lesson id (mantém o finishedAt mais recente). Evita contagem inflada. */
function dedupeProgressByLessonId(items: CurseducaProgressItem[]): CurseducaProgressItem[] {
    const best = new Map<number, CurseducaProgressItem>();
    const withoutLessonId: CurseducaProgressItem[] = [];

    for (const item of items) {
        if (!item.finishedAt) {
            continue;
        }
        const lid = item.lesson?.id;
        if (lid == null) {
            withoutLessonId.push(item);
            continue;
        }
        const prev = best.get(lid);
        if (!prev || new Date(item.finishedAt) > new Date(prev.finishedAt!)) {
            best.set(lid, item);
        }
    }

    return [...withoutLessonId, ...best.values()];
}

async function fetchAllProgress(memberSlug: string, auth: CurseducaAuthConfig): Promise<CurseducaProgressItem[]> {
    const { contentsBaseUrl } = auth;
    const limit = 200;
    let offset = 0;
    let hasMore = true;
    const items: CurseducaProgressItem[] = [];

    while (hasMore) {
        const url = new URL("/reports/progress", contentsBaseUrl);
        url.searchParams.set("member", memberSlug);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("offset", String(offset));

        const payload = await fetchJsonOrThrow(url.toString(), auth) as {
            metadata?: { hasMore?: boolean; hasmore?: boolean };
            data?: CurseducaProgressItem[];
        };

        const pageData = Array.isArray(payload.data) ? payload.data : [];
        items.push(...pageData);

        hasMore = Boolean(payload.metadata?.hasMore ?? payload.metadata?.hasmore);
        offset += limit;
    }

    return items;
}

/**
 * Mapeia progresso Curseduca → taskIds do catálogo (1 task por id, finishedAt mais recente).
 */
function mapProgressToTaskCompletions(
    progressItems: CurseducaProgressItem[],
    catalogTaskIds: Set<string>,
): {
    completedLessons: number;
    mappedLessons: number;
    skippedWithoutMap: number;
    completions: MappedTaskCompletion[];
} {
    let completedLessons = 0;
    let mappedLessons = 0;
    let skippedWithoutMap = 0;
    const bestByTaskId = new Map<string, Date>();

    for (const item of progressItems) {
        if (!item.finishedAt) {
            continue;
        }

        completedLessons += 1;
        const classId = item.lesson?.id ?? null;
        if (!classId) {
            skippedWithoutMap += 1;
            continue;
        }

        const taskId = resolveTaskIdFromClassId(classId);
        if (!taskId || !catalogTaskIds.has(taskId)) {
            skippedWithoutMap += 1;
            continue;
        }

        const completedAt = new Date(item.finishedAt);
        if (Number.isNaN(completedAt.getTime())) {
            skippedWithoutMap += 1;
            continue;
        }

        mappedLessons += 1;
        const previous = bestByTaskId.get(taskId);
        if (!previous || completedAt.getTime() > previous.getTime()) {
            bestByTaskId.set(taskId, completedAt);
        }
    }

    return {
        completedLessons,
        mappedLessons,
        skippedWithoutMap,
        completions: [...bestByTaskId.entries()].map(([taskId, completedAt]) => ({
            taskId,
            completedAt,
        })),
    };
}

export type CurseducaSyncResult = {
    totalProgressItems: number;
    completedLessons: number;
    mappedLessons: number;
    upsertedTasks: number;
    createdTasks: number;
    updatedTasks: number;
    unchangedTasks: number;
    skippedWithoutMap: number;
    memberSlug: string;
};

export async function syncCurseducaProgressForUser(userId: string): Promise<CurseducaSyncResult> {
    try {
        const auth = getCurseducaAuthConfig();

        const [{ slug: memberSlug }, catalog] = await Promise.all([
            getMemberSlugForSync(userId, auth),
            getPublishedJornadaCatalog(),
        ]);

        const rawProgress = await fetchAllProgress(memberSlug, auth);
        const progressItems = dedupeProgressByLessonId(rawProgress);
        const catalogTaskIds = new Set(catalog.tasks.map((task) => task.id));

        const {
            completedLessons,
            mappedLessons,
            skippedWithoutMap,
            completions,
        } = mapProgressToTaskCompletions(progressItems, catalogTaskIds);

        let createdTasks = 0;
        let updatedTasks = 0;
        let unchangedTasks = 0;

        if (completions.length > 0) {
            const existing = await withRlsUserContext(userId, async (transaction) => (
                transaction.userJornadaTaskProgress.findMany({
                    where: { userId },
                    select: {
                        taskId: true,
                        completedAt: true,
                    },
                })
            ), TX_OPTIONS);

            const existingByTaskId = new Map(
                existing.map((row) => [row.taskId, row.completedAt] as const),
            );

            const toCreate: MappedTaskCompletion[] = [];
            const toUpdate: MappedTaskCompletion[] = [];

            for (const completion of completions) {
                const current = existingByTaskId.get(completion.taskId);
                if (!current) {
                    toCreate.push(completion);
                    continue;
                }

                if (current.getTime() !== completion.completedAt.getTime()) {
                    toUpdate.push(completion);
                    continue;
                }

                unchangedTasks += 1;
            }

            for (const batch of chunkArray(toCreate, CREATE_BATCH_SIZE)) {
                await withRlsUserContext(userId, async (transaction) => {
                    await transaction.userJornadaTaskProgress.createMany({
                        data: batch.map((item) => ({
                            userId,
                            taskId: item.taskId,
                            completedAt: item.completedAt,
                        })),
                        skipDuplicates: true,
                    });
                }, TX_OPTIONS);
            }
            createdTasks = toCreate.length;

            for (const batch of chunkArray(toUpdate, UPDATE_BATCH_SIZE)) {
                await withRlsUserContext(userId, async (transaction) => {
                    await mapWithConcurrency(batch, UPDATE_CONCURRENCY, async (item) => {
                        await transaction.userJornadaTaskProgress.update({
                            where: {
                                userId_taskId: {
                                    userId,
                                    taskId: item.taskId,
                                },
                            },
                            data: {
                                completedAt: item.completedAt,
                            },
                        });
                    });
                }, TX_OPTIONS);
            }
            updatedTasks = toUpdate.length;
        }

        // Recupera dias já sincronizados sem streak e passa a pontuar syncs futuros.
        await withRlsUserContext(userId, async (transaction) => {
            await reconcileStreakFromUserTaskProgress(transaction, userId);
        }, {
            maxWait: 10_000,
            timeout: 25_000,
        });

        await prisma.user.update({
            where: { id: userId },
            data: {
                curseducaSyncNeedsRetry: false,
            },
        });

        return {
            totalProgressItems: rawProgress.length,
            completedLessons,
            mappedLessons,
            upsertedTasks: createdTasks + updatedTasks,
            createdTasks,
            updatedTasks,
            unchangedTasks,
            skippedWithoutMap,
            memberSlug,
        };
    } catch (error) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                curseducaSyncNeedsRetry: true,
            },
        }).catch(() => undefined);
        throw error;
    }
}
