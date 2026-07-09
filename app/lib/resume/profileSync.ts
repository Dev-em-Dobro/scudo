import { COURSE_PROJECT_CATALOG } from '@/app/lib/resume/courseProjects';
import {
    formatContactUrl,
    mergeProfileHeaderIntoDocument,
} from '@/app/lib/resume/documentUtils';
import type { AtsResumeDocument, AtsResumeProject } from '@/app/lib/resume/types';
import type { RlsTransaction } from '@/app/lib/rls';

export type ProfileHeaderSource = {
    fullName: string | null;
    city: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
};

export function deriveKnownTechnologiesFromResumeProjects(projects: AtsResumeProject[]): string[] {
    return [...new Set(
        projects
            .flatMap((project) => project.technologies)
            .map((tech) => tech.trim())
            .filter(Boolean),
    )];
}

export function findCourseProjectKeyByTitle(title: string): string | null {
    const normalized = title.trim().toLowerCase();
    const match = COURSE_PROJECT_CATALOG.find(
        (project) => project.title.trim().toLowerCase() === normalized,
    );

    return match?.key ?? null;
}

export function resumeHeaderDiffersFromProfile(
    document: AtsResumeDocument,
    profile: ProfileHeaderSource,
    userEmail: string,
    userName: string | null,
): boolean {
    const merged = mergeProfileHeaderIntoDocument(document, profile, userEmail, userName);

    return (
        merged.header.fullName !== document.header.fullName
        || merged.header.city !== document.header.city
        || merged.header.email !== document.header.email
        || merged.header.linkedinUrl !== document.header.linkedinUrl
        || merged.header.githubUrl !== document.header.githubUrl
    );
}

export function applyProfileHeaderToDocument(
    document: AtsResumeDocument,
    profile: ProfileHeaderSource,
    userEmail: string,
    userName: string | null,
): AtsResumeDocument {
    return mergeProfileHeaderIntoDocument(document, profile, userEmail, userName);
}

export type ProfileBodySource = {
    professionalSummary: string | null;
    experiences: string[];
    certifications: string[];
    languages: string[];
};

function pickRicherText(profileValue: string | null | undefined, documentValue: string | null | undefined) {
    const profileText = profileValue?.trim() ?? '';
    const documentText = documentValue?.trim() ?? '';

    if (!profileText && !documentText) {
        return null;
    }

    if (profileText.length >= documentText.length) {
        return profileText || null;
    }

    return documentText || null;
}

function pickRicherStringList(profileValues: string[], documentValues: string[]) {
    if (profileValues.length === 0) {
        return documentValues;
    }

    if (documentValues.length === 0) {
        return profileValues;
    }

    const profileJoined = profileValues.join('\n');
    const documentJoined = documentValues.join('\n');

    return profileJoined.length >= documentJoined.length ? profileValues : documentValues;
}

/**
 * Antes da 1ª customização no editor, o perfil pode ter textos mais completos (ex.: upload de CV)
 * que ainda não foram espelhados no JSON do currículo gerado.
 */
export function mergeProfileBodyIntoDocument(
    document: AtsResumeDocument,
    profile: ProfileBodySource,
): AtsResumeDocument {
    if (document.customizedAt) {
        return document;
    }

    return {
        ...document,
        professionalSummary: pickRicherText(profile.professionalSummary, document.professionalSummary),
        experiences: pickRicherStringList(profile.experiences, document.experiences),
        certifications: pickRicherStringList(profile.certifications, document.certifications),
        languages: pickRicherStringList(profile.languages, document.languages),
    };
}

export function resumeBodyDiffersFromProfile(
    document: AtsResumeDocument,
    profile: ProfileBodySource,
): boolean {
    if (document.customizedAt) {
        return false;
    }

    const merged = mergeProfileBodyIntoDocument(document, profile);

    return (
        merged.professionalSummary !== document.professionalSummary
        || merged.experiences.join('\n') !== document.experiences.join('\n')
        || merged.certifications.join('\n') !== document.certifications.join('\n')
        || merged.languages.join('\n') !== document.languages.join('\n')
    );
}

export async function syncResumeBodyToUserProfile(
    transaction: RlsTransaction,
    profileId: string,
    document: AtsResumeDocument,
): Promise<void> {
    const knownTechnologies = deriveKnownTechnologiesFromResumeProjects(document.projects);

    await transaction.userProfile.update({
        where: { id: profileId },
        data: {
            professionalSummary: document.professionalSummary?.trim() || null,
            experiences: document.experiences,
            certifications: document.certifications,
            languages: document.languages,
            knownTechnologies: deriveKnownTechnologiesFromResumeProjects(document.projects),
        },
    });

    await syncResumeProjectsToUserProfile(transaction, profileId, document.projects);
}

async function syncResumeProjectsToUserProfile(
    transaction: RlsTransaction,
    profileId: string,
    resumeProjects: AtsResumeProject[],
): Promise<void> {
    const existing = await transaction.userProject.findMany({
        where: { userProfileId: profileId },
    });
    const existingManual = existing.filter((project) => !project.courseProjectKey);

    for (const resumeProject of resumeProjects) {
        const courseKey = findCourseProjectKeyByTitle(resumeProject.title);

        if (courseKey) {
            await transaction.userProject.upsert({
                where: {
                    userProfileId_courseProjectKey: {
                        userProfileId: profileId,
                        courseProjectKey: courseKey,
                    },
                },
                update: {
                    title: resumeProject.title,
                    shortDescription: resumeProject.description || null,
                    technologies: resumeProject.technologies,
                    deployUrl: resumeProject.deployUrl ?? null,
                },
                create: {
                    userProfileId: profileId,
                    courseProjectKey: courseKey,
                    title: resumeProject.title,
                    shortDescription: resumeProject.description || null,
                    technologies: resumeProject.technologies,
                    deployUrl: resumeProject.deployUrl ?? null,
                },
            });
            continue;
        }

        const manualMatch = existingManual.find(
            (project) => project.title.trim().toLowerCase() === resumeProject.title.trim().toLowerCase(),
        );

        if (manualMatch) {
            await transaction.userProject.update({
                where: { id: manualMatch.id },
                data: {
                    title: resumeProject.title,
                    shortDescription: resumeProject.description || null,
                    technologies: resumeProject.technologies,
                    deployUrl: resumeProject.deployUrl ?? null,
                },
            });
            continue;
        }

        await transaction.userProject.create({
            data: {
                userProfileId: profileId,
                title: resumeProject.title,
                shortDescription: resumeProject.description || null,
                technologies: resumeProject.technologies,
                deployUrl: resumeProject.deployUrl ?? null,
            },
        });
    }
}

export function formatProfileHeaderForDisplay(profile: ProfileHeaderSource, userEmail: string, userName: string | null) {
    return {
        fullName: profile.fullName?.trim() || userName?.trim() || 'Seu Nome',
        city: profile.city?.trim() || null,
        email: userEmail,
        linkedinUrl: formatContactUrl(profile.linkedinUrl),
        githubUrl: formatContactUrl(profile.githubUrl),
    };
}
