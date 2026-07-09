import type { Prisma } from '@prisma/client';

import { buildAtsResumeDocument } from '@/app/lib/resume/buildDocument';
import { getUnlockedCourseProjects } from '@/app/lib/resume/courseProjects';
import {
    mergeProfileHeaderIntoDocument,
    mergeUnlockedProjectsIntoDocument,
    recomputeTechnologyGroups,
} from '@/app/lib/resume/documentUtils';
import {
    applyProfileHeaderToDocument,
    mergeProfileBodyIntoDocument,
    resumeBodyDiffersFromProfile,
    resumeHeaderDiffersFromProfile,
    syncResumeBodyToUserProfile,
} from '@/app/lib/resume/profileSync';
import { generateAtsResumePdf } from '@/app/lib/resume/generatePdf';
import type { AtsResumeDocument, GeneratedResumeMeta } from '@/app/lib/resume/types';
import type { RlsTransaction } from '@/app/lib/rls';
import { withRlsUserContext } from '@/app/lib/rls';

const STAGE_RANK: Record<string, string> = {
    s1: 'Ferro',
    s2: 'Bronze',
    s3: 'Prata',
    s4: 'Ouro',
    s5: 'Platina',
    s6: 'Esmeralda',
    s7: 'Diamante',
    s8: 'Mythril',
    s9: 'Mestre',
    s10: 'Lendário',
};

const STAGE_ORDER = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];

function resolveLatestStageId(completedStageIds: Set<string>) {
    return STAGE_ORDER.filter((stageId) => completedStageIds.has(stageId)).at(-1) ?? null;
}

function resolveRankName(stageId: string | null) {
    if (!stageId) {
        return null;
    }

    return STAGE_RANK[stageId] ?? null;
}

async function loadResumeRefreshContext(transaction: RlsTransaction, userId: string) {
    const [user, completions, profile] = await Promise.all([
        transaction.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        }),
        transaction.userJornadaStageCompletion.findMany({
            where: { userId },
            select: { stageId: true },
        }),
        transaction.userProfile.findUnique({
            where: { userId },
            select: {
                generatedResumeUpdatedAt: true,
                updatedAt: true,
                generatedResumeJson: true,
                fullName: true,
                city: true,
                linkedinUrl: true,
                githubUrl: true,
            },
        }),
    ]);

    if (!user?.email || !profile?.generatedResumeUpdatedAt) {
        return null;
    }

    const completedStageIds = new Set(completions.map((row) => row.stageId));
    const latestStageId = resolveLatestStageId(completedStageIds);

    return {
        user,
        completedStageIds,
        latestStageId,
        rankName: resolveRankName(latestStageId),
        profileUpdatedAt: profile.updatedAt,
        generatedResumeUpdatedAt: profile.generatedResumeUpdatedAt,
        existingDocument: parseGeneratedResumeDocument(profile.generatedResumeJson),
        profileHeader: {
            fullName: profile.fullName,
            city: profile.city,
            linkedinUrl: profile.linkedinUrl,
            githubUrl: profile.githubUrl,
        },
    };
}

async function persistGeneratedResumeDocument(
    transaction: RlsTransaction,
    profileId: string,
    document: AtsResumeDocument,
    options: {
        stageId: string | null;
        syncBodyToProfile?: boolean;
        deferPdf?: boolean;
    },
): Promise<GeneratedResumeMeta> {
    const normalizedDocument = recomputeTechnologyGroups({
        ...document,
        lastUpdatedAt: new Date().toISOString(),
    });
    const now = new Date();

    if (options.syncBodyToProfile) {
        await syncResumeBodyToUserProfile(transaction, profileId, normalizedDocument);
    }

    const pdfBytes = options.deferPdf
        ? null
        : await generateAtsResumePdf(normalizedDocument);

    await transaction.userProfile.update({
        where: { id: profileId },
        data: {
            generatedResumeJson: normalizedDocument as unknown as Prisma.InputJsonValue,
            ...(pdfBytes ? { generatedResumePdf: Buffer.from(pdfBytes) } : {}),
            generatedResumeUpdatedAt: now,
            generatedResumeStageId: options.stageId,
        },
    });

    return {
        available: true,
        updatedAt: now.toISOString(),
        stageId: options.stageId,
        rankName: normalizedDocument.lastRankName,
        projectCount: normalizedDocument.projects.length,
    };
}

type SyncGeneratedResumeInput = {
    transaction: RlsTransaction;
    userId: string;
    userEmail: string;
    userName: string | null;
    completedStageIds: Set<string>;
    triggerStageId: string | null;
    rankName: string | null;
    deferPdf?: boolean;
};

function mergeKnownTechnologies(existing: string[], projectTechnologies: string[]): string[] {
    const seen = new Set(existing.map((tech) => tech.toLowerCase()));
    const merged = [...existing];

    for (const tech of projectTechnologies) {
        const normalized = tech.trim();
        if (!normalized) {
            continue;
        }

        const key = normalized.toLowerCase();
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        merged.push(normalized);
    }

    return merged;
}

export async function syncGeneratedResumeForUser(input: SyncGeneratedResumeInput): Promise<GeneratedResumeMeta | null> {
    const profile = await input.transaction.userProfile.findUnique({
        where: { userId: input.userId },
        include: {
            projects: {
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!profile) {
        return null;
    }

    const unlockedProjects = getUnlockedCourseProjects(input.completedStageIds);
    if (unlockedProjects.length === 0) {
        return null;
    }

    for (const courseProject of unlockedProjects) {
        await input.transaction.userProject.upsert({
            where: {
                userProfileId_courseProjectKey: {
                    userProfileId: profile.id,
                    courseProjectKey: courseProject.key,
                },
            },
            update: {
                title: courseProject.title,
                shortDescription: courseProject.description,
                technologies: courseProject.technologies,
                deployUrl: courseProject.deployUrl ?? null,
            },
            create: {
                userProfileId: profile.id,
                courseProjectKey: courseProject.key,
                title: courseProject.title,
                shortDescription: courseProject.description,
                technologies: courseProject.technologies,
                deployUrl: courseProject.deployUrl ?? null,
            },
        });
    }

    const refreshedProfile = await input.transaction.userProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: {
            projects: {
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    const existingDocument = parseGeneratedResumeDocument(profile.generatedResumeJson);

    if (existingDocument?.customizedAt) {
        const withNewProjects = mergeUnlockedProjectsIntoDocument(existingDocument, unlockedProjects);
        const withHeader = mergeProfileHeaderIntoDocument(
            withNewProjects,
            refreshedProfile,
            input.userEmail,
            input.userName,
        );

        return persistGeneratedResumeDocument(input.transaction, profile.id, withHeader, {
            stageId: input.triggerStageId,
            deferPdf: input.deferPdf,
        });
    }

    const document = buildAtsResumeDocument({
        profile: refreshedProfile,
        userEmail: input.userEmail,
        userName: input.userName,
        completedStageIds: input.completedStageIds,
        rankName: input.rankName,
    });

    const knownTechnologies = mergeKnownTechnologies(
        refreshedProfile.knownTechnologies,
        unlockedProjects.flatMap((project) => project.technologies),
    );

    await input.transaction.userProfile.update({
        where: { id: profile.id },
        data: {
            knownTechnologies,
        },
    });

    return persistGeneratedResumeDocument(input.transaction, profile.id, document, {
        stageId: input.triggerStageId,
        deferPdf: input.deferPdf,
    });
}

export async function saveGeneratedResumeDocument(
    userId: string,
    document: AtsResumeDocument,
): Promise<GeneratedResumeMeta | null> {
    return withRlsUserContext(userId, async (transaction) => {
        const profile = await transaction.userProfile.findUnique({
            where: { userId },
            select: {
                id: true,
                generatedResumeUpdatedAt: true,
                generatedResumeStageId: true,
                fullName: true,
                city: true,
                linkedinUrl: true,
                githubUrl: true,
                user: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        });

        if (!profile?.generatedResumeUpdatedAt || !profile.user.email) {
            return null;
        }

        const withProfileHeader = applyProfileHeaderToDocument(
            document,
            profile,
            profile.user.email,
            profile.user.name,
        );

        const customizedDocument: AtsResumeDocument = {
            ...withProfileHeader,
            customizedAt: new Date().toISOString(),
        };

        return persistGeneratedResumeDocument(transaction, profile.id, customizedDocument, {
            stageId: profile.generatedResumeStageId,
            syncBodyToProfile: true,
        });
    });
}

async function mergeHeaderFromProfileForUser(
    transaction: RlsTransaction,
    userId: string,
    context: NonNullable<Awaited<ReturnType<typeof loadResumeRefreshContext>>>,
): Promise<GeneratedResumeMeta | null> {
    const profile = await transaction.userProfile.findUnique({
        where: { userId },
        select: {
            id: true,
            generatedResumeJson: true,
            generatedResumeStageId: true,
        },
    });

    const existingDocument = parseGeneratedResumeDocument(profile?.generatedResumeJson ?? null);
    if (!profile?.generatedResumeJson || !existingDocument) {
        return null;
    }

    const merged = mergeProfileHeaderIntoDocument(
        existingDocument,
        context.profileHeader,
        context.user.email,
        context.user.name,
    );

    return persistGeneratedResumeDocument(transaction, profile.id, merged, {
        stageId: profile.generatedResumeStageId,
    });
}

export async function refreshGeneratedResumeForUser(userId: string): Promise<GeneratedResumeMeta | null> {
    return withRlsUserContext(userId, async (transaction) => {
        const context = await loadResumeRefreshContext(transaction, userId);
        if (!context) {
            return null;
        }

        if (context.existingDocument?.customizedAt) {
            return mergeHeaderFromProfileForUser(transaction, userId, context);
        }

        return syncGeneratedResumeForUser({
            transaction,
            userId,
            userEmail: context.user.email,
            userName: context.user.name,
            completedStageIds: context.completedStageIds,
            triggerStageId: context.latestStageId,
            rankName: context.rankName,
        });
    });
}

/**
 * Regenera o currículo quando o perfil foi editado depois da última geração.
 */
export async function ensureGeneratedResumeIsCurrent(userId: string): Promise<GeneratedResumeMeta | null> {
    return withRlsUserContext(userId, async (transaction) => {
        const context = await loadResumeRefreshContext(transaction, userId);
        if (!context) {
            return null;
        }

        if (context.profileUpdatedAt <= context.generatedResumeUpdatedAt) {
            const profile = await transaction.userProfile.findUnique({
                where: { userId },
                select: {
                    generatedResumeUpdatedAt: true,
                    generatedResumeStageId: true,
                    generatedResumeJson: true,
                    generatedResumePdf: true,
                },
            });

            return profile ? toGeneratedResumeMeta(profile) : null;
        }

        if (context.existingDocument?.customizedAt) {
            return mergeHeaderFromProfileForUser(transaction, userId, context);
        }

        return syncGeneratedResumeForUser({
            transaction,
            userId,
            userEmail: context.user.email,
            userName: context.user.name,
            completedStageIds: context.completedStageIds,
            triggerStageId: context.latestStageId,
            rankName: context.rankName,
        });
    });
}

export async function getCurrentGeneratedResumeDocument(userId: string): Promise<{
    document: AtsResumeDocument;
    updatedAt: string;
} | null> {
    await ensureGeneratedResumeIsCurrent(userId);

    const result = await withRlsUserContext(userId, async (transaction) => {
        const profile = await transaction.userProfile.findUnique({
            where: { userId },
            select: {
                id: true,
                generatedResumeJson: true,
                generatedResumeUpdatedAt: true,
                generatedResumeStageId: true,
                fullName: true,
                city: true,
                linkedinUrl: true,
                githubUrl: true,
                professionalSummary: true,
                experiences: true,
                certifications: true,
                languages: true,
                user: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        });

        if (!profile?.generatedResumeJson || !profile.generatedResumeUpdatedAt || !profile.user.email) {
            return null;
        }

        const storedDocument = parseGeneratedResumeDocument(profile.generatedResumeJson);
        if (!storedDocument) {
            return null;
        }

        const withHeader = applyProfileHeaderToDocument(
            storedDocument,
            profile,
            profile.user.email,
            profile.user.name,
        );
        const withBody = mergeProfileBodyIntoDocument(withHeader, profile);
        const normalizedDocument = recomputeTechnologyGroups(withBody);

        const shouldPersist = resumeHeaderDiffersFromProfile(storedDocument, profile, profile.user.email, profile.user.name)
            || resumeBodyDiffersFromProfile(storedDocument, profile);

        if (shouldPersist) {
            const meta = await persistGeneratedResumeDocument(transaction, profile.id, normalizedDocument, {
                stageId: profile.generatedResumeStageId,
            });

            return {
                document: normalizedDocument,
                updatedAt: meta.updatedAt ?? new Date().toISOString(),
            };
        }

        return {
            document: normalizedDocument,
            updatedAt: profile.generatedResumeUpdatedAt.toISOString(),
        };
    });

    return result;
}

export function parseGeneratedResumeDocument(value: Prisma.JsonValue | null): AtsResumeDocument | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    return value as AtsResumeDocument;
}

export function toGeneratedResumeMeta(profile: {
    generatedResumeUpdatedAt: Date | null;
    generatedResumeStageId: string | null;
    generatedResumeJson: Prisma.JsonValue | null;
    generatedResumePdf?: Uint8Array | Buffer | null;
}): GeneratedResumeMeta {
    const document = parseGeneratedResumeDocument(profile.generatedResumeJson);

    return {
        available: Boolean(profile.generatedResumeUpdatedAt && profile.generatedResumePdf),
        updatedAt: profile.generatedResumeUpdatedAt?.toISOString() ?? null,
        stageId: profile.generatedResumeStageId,
        rankName: document?.lastRankName ?? null,
        projectCount: document?.projects.length ?? 0,
    };
}
