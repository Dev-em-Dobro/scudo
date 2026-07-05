import type { Prisma } from '@prisma/client';

import {
    buildDefaultProfessionalSummary,
    getUnlockedCourseProjects,
    groupTechnologiesForAts,
} from '@/app/lib/resume/courseProjects';
import { dedupeResumeProjectsByTitle } from '@/app/lib/resume/documentUtils';
import type { AtsResumeDocument } from '@/app/lib/resume/types';

type ProfileWithProjects = Prisma.UserProfileGetPayload<{
    include: { projects: true };
}>;

type BuildDocumentInput = {
    profile: ProfileWithProjects;
    userEmail: string;
    userName: string | null;
    completedStageIds: Set<string>;
    rankName: string | null;
};

function formatContactUrl(url: string | null): string | null {
    if (!url) {
        return null;
    }

    return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function mergeUniqueTechnologies(values: string[][]): string[] {
    const seen = new Set<string>();
    const merged: string[] = [];

    for (const list of values) {
        for (const tech of list) {
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
    }

    return merged;
}

export function buildAtsResumeDocument(input: BuildDocumentInput): AtsResumeDocument {
    const courseProjects = getUnlockedCourseProjects(input.completedStageIds);
    const manualProjects = input.profile.projects.filter((project) => !project.courseProjectKey);

    const courseProjectEntries = courseProjects.map((project) => ({
        title: project.title,
        description: project.description,
        technologies: project.technologies,
        deployUrl: project.deployUrl ?? null,
    }));

    const manualProjectEntries = manualProjects.map((project) => ({
        title: project.title,
        description: project.shortDescription ?? '',
        technologies: project.technologies,
        deployUrl: project.deployUrl ?? null,
    }));

    const projects = dedupeResumeProjectsByTitle([...courseProjectEntries, ...manualProjectEntries]);
    const allTechnologies = mergeUniqueTechnologies([
        projects.flatMap((project) => project.technologies),
        input.profile.knownTechnologies,
    ]);

    const professionalSummary = input.profile.professionalSummary?.trim()
        || buildDefaultProfessionalSummary(input.rankName, projects.length);

    return {
        header: {
            fullName: input.profile.fullName?.trim() || input.userName?.trim() || 'Seu Nome',
            city: input.profile.city?.trim() || null,
            email: input.userEmail,
            linkedinUrl: formatContactUrl(input.profile.linkedinUrl),
            githubUrl: formatContactUrl(input.profile.githubUrl),
        },
        professionalSummary,
        experiences: input.profile.experiences,
        projects,
        education: ['Formação DevQuest — Programação Full Stack (em andamento)'],
        technologyGroups: groupTechnologiesForAts(allTechnologies),
        certifications: input.profile.certifications.length > 0
            ? input.profile.certifications
            : ['DevQuest — Trilha Full Stack (certificado MEC disponível na plataforma)'],
        languages: input.profile.languages.length > 0
            ? input.profile.languages
            : ['Português — Nativo'],
        lastUpdatedAt: new Date().toISOString(),
        lastRankName: input.rankName,
    };
}
