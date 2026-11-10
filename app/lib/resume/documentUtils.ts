import type { CourseProjectDefinition } from '@/app/lib/resume/courseProjects';
import { COURSE_PROJECT_CATALOG, groupTechnologiesForAts, sortResumeProjectsByRelevance } from '@/app/lib/resume/courseProjects';
import type { AtsResumeDocument, AtsResumeProject } from '@/app/lib/resume/types';

export const PROJECT_DEPLOY_URL_PLACEHOLDER = '[preencher] link do projeto no ar';
export const PROJECT_REPOSITORY_URL_PLACEHOLDER = '[preencher] https://github.com/seu-usuario/seu-repositorio';

export function isProjectLinkPlaceholder(value: string | null | undefined): boolean {
    if (!value?.trim()) {
        return true;
    }

    return value.trim().toLowerCase().startsWith('[preencher]');
}

export function toPersistedProjectLink(value: string | null | undefined): string | null {
    if (!value?.trim() || isProjectLinkPlaceholder(value)) {
        return null;
    }

    return value.trim();
}

export function ensureProjectLinkPlaceholders(project: AtsResumeProject): AtsResumeProject {
    return {
        ...project,
        deployUrl: toPersistedProjectLink(project.deployUrl) ?? PROJECT_DEPLOY_URL_PLACEHOLDER,
        repositoryUrl: toPersistedProjectLink(project.repositoryUrl) ?? PROJECT_REPOSITORY_URL_PLACEHOLDER,
    };
}

export function withEnsuredProjectLinkPlaceholders(document: AtsResumeDocument): AtsResumeDocument {
    return {
        ...document,
        projects: document.projects.map(ensureProjectLinkPlaceholders),
    };
}

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
    const projects = document.projects;
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
    const existingKeys = new Set(document.projects.map((project) => project.courseProjectKey).filter(Boolean));
    const existingTitles = new Set(document.projects.filter((project) => project.source !== 'manual').map((project) => project.title.trim().toLowerCase()));
    const newProjects = unlockedProjects
        .filter((project) => !existingKeys.has(project.key) && !existingTitles.has(project.title.trim().toLowerCase()))
        .map((project) => ensureProjectLinkPlaceholders({
            source: 'course',
            courseProjectKey: project.key,
            title: project.title,
            description: project.description,
            technologies: project.technologies,
            deployUrl: project.deployUrl ?? null,
            repositoryUrl: null,
        }));

    if (newProjects.length === 0) {
        return withEnsuredProjectLinkPlaceholders(document);
    }

    const courseProjects = document.projects.filter((project) => project.source !== 'manual');
    const manualProjects = document.projects.filter((project) => project.source === 'manual');
    // Preserve a ordem escolhida pelo aluno; novos projetos entram na prioridade do catálogo.
    for (const project of sortResumeProjectsByRelevance(newProjects)) {
        const priorityOrder = sortResumeProjectsByRelevance([...courseProjects, project]);
        const nextProject = priorityOrder.slice(priorityOrder.indexOf(project) + 1)
            .find((candidate) => courseProjects.includes(candidate));
        const index = nextProject ? courseProjects.indexOf(nextProject) : courseProjects.length;
        courseProjects.splice(index, 0, project);
    }

    return withEnsuredProjectLinkPlaceholders(recomputeTechnologyGroups({
        ...document,
        projects: [...courseProjects, ...manualProjects],
        lastUpdatedAt: new Date().toISOString(),
    }));
}

export function identifyLegacyCourseProjects(document: AtsResumeDocument): AtsResumeDocument {
    return {
        ...document,
        projects: document.projects.map((project) => {
            if (project.source || project.courseProjectKey) return project;
            const catalogProject = COURSE_PROJECT_CATALOG.find(
                (candidate) => candidate.title.trim().toLowerCase() === project.title.trim().toLowerCase(),
            );
            return catalogProject
                ? { ...project, source: 'course' as const, courseProjectKey: catalogProject.key }
                : project;
        }),
    };
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
