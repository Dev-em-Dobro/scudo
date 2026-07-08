import type { CourseProjectDefinition } from '@/app/lib/resume/courseProjects';
import { groupTechnologiesForAts, sortResumeProjectsByRelevance } from '@/app/lib/resume/courseProjects';
import type { AtsResumeDocument, AtsResumeProject } from '@/app/lib/resume/types';

export function formatContactUrl(url: string | null | undefined): string | null {
    if (!url) {
        return null;
    }

    return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function toStorageUrl(display: string | null | undefined): string | null {
    if (!display?.trim()) {
        return null;
    }

    const trimmed = display.replace(/^https?:\/\//i, '').trim();
    return trimmed ? `https://${trimmed}` : null;
}

export function dedupeResumeProjectsByTitle<T extends Pick<AtsResumeProject, 'title'>>(projects: T[]): T[] {
    const seen = new Set<string>();
    const deduped: T[] = [];

    for (const project of projects) {
        const key = project.title.trim().toLowerCase();
        if (!key || seen.has(key)) {
            continue;
        }

        seen.add(key);
        deduped.push(project);
    }

    return deduped;
}

export function recomputeTechnologyGroups(document: AtsResumeDocument): AtsResumeDocument {
    const projects = sortResumeProjectsByRelevance(dedupeResumeProjectsByTitle(document.projects));
    const technologies = projects.flatMap((project) => project.technologies);

    return {
        ...document,
        projects,
        technologyGroups: groupTechnologiesForAts(technologies),
    };
}

export function mergeProfileHeaderIntoDocument(
    document: AtsResumeDocument,
    profile: {
        fullName: string | null;
        city: string | null;
        linkedinUrl: string | null;
        githubUrl: string | null;
    },
    userEmail: string,
    userName: string | null,
): AtsResumeDocument {
    return {
        ...document,
        header: {
            fullName: profile.fullName?.trim() || userName?.trim() || document.header.fullName,
            city: profile.city?.trim() || null,
            email: userEmail,
            linkedinUrl: formatContactUrl(profile.linkedinUrl),
            githubUrl: formatContactUrl(profile.githubUrl),
        },
        lastUpdatedAt: new Date().toISOString(),
    };
}

export function mergeUnlockedProjectsIntoDocument(
    document: AtsResumeDocument,
    unlockedProjects: CourseProjectDefinition[],
): AtsResumeDocument {
    const existingTitles = new Set(document.projects.map((project) => project.title.trim().toLowerCase()));
    const newProjects = unlockedProjects
        .filter((project) => !existingTitles.has(project.title.trim().toLowerCase()))
        .map((project) => ({
            title: project.title,
            description: project.description,
            technologies: project.technologies,
            deployUrl: project.deployUrl ?? null,
        }));

    if (newProjects.length === 0) {
        return document;
    }

    return recomputeTechnologyGroups({
        ...document,
        projects: sortResumeProjectsByRelevance([...document.projects, ...newProjects]),
        lastUpdatedAt: new Date().toISOString(),
    });
}

export function parseCommaSeparatedList(value: string): string[] {
    return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}

export function parseLineSeparatedList(value: string): string[] {
    return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

export function joinCommaSeparatedList(values: string[]): string {
    return values.join(', ');
}

export function joinLineSeparatedList(values: string[]): string {
    return values.join('\n');
}
