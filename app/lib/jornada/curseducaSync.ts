import { prisma } from "@/app/lib/prisma";
import { getCatalogTaskById } from "@/app/lib/jornada/service";
import { resolveTaskIdFromClassId } from "@/app/lib/jornada/curseducaLessonTaskMap";
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

export type CurseducaSyncResult = {
    totalProgressItems: number;
    completedLessons: number;
    mappedLessons: number;
    upsertedTasks: number;
    skippedWithoutMap: number;
    memberSlug: string;
};

export async function syncCurseducaProgressForUser(userId: string): Promise<CurseducaSyncResult> {
    try {
        const auth = getCurseducaAuthConfig();

        const { slug: memberSlug } = await getMemberSlugForSync(userId, auth);
        const rawProgress = await fetchAllProgress(memberSlug, auth);

        const progressItems = dedupeProgressByLessonId(rawProgress);

        let completedLessons = 0;
        let mappedLessons = 0;
        let upsertedTasks = 0;
        let skippedWithoutMap = 0;
        const upsertOps: Parameters<typeof prisma.userJornadaTaskProgress.upsert>[0][] = [];

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
            if (!taskId || !getCatalogTaskById(taskId)) {
                skippedWithoutMap += 1;
                continue;
            }

            mappedLessons += 1;
            const completedAt = new Date(item.finishedAt);
            upsertOps.push({
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
        }

        if (upsertOps.length > 0) {
            const UPSERT_BATCH_SIZE = 40;

            for (let offset = 0; offset < upsertOps.length; offset += UPSERT_BATCH_SIZE) {
                const batch = upsertOps.slice(offset, offset + UPSERT_BATCH_SIZE);

                await withRlsUserContext(userId, async (transaction) => {
                    for (const args of batch) {
                        await transaction.userJornadaTaskProgress.upsert(args);
                    }
                }, {
                    maxWait: 10_000,
                    timeout: 25_000,
                });
            }

            upsertedTasks = upsertOps.length;
        }

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
            upsertedTasks,
            skippedWithoutMap,
            memberSlug,
        };
    } catch (error) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                curseducaSyncNeedsRetry: true,
            },
        });
        throw error;
    }
}
