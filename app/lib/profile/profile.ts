import { Prisma, ResumeSyncStatus } from '@prisma/client';

import { prisma } from '@/app/lib/prisma';

export type ClientProfile = {
    fullName: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    city: string | null;
    professionalSummary: string | null;
    experiences: string[];
    knownTechnologies: string[];
    softSkills: string[];
    certifications: string[];
    languages: string[];
    projects: {
        id: string;
        title: string;
        shortDescription: string | null;
        technologies: string[];
        deployUrl: string | null;
    }[];
    resumeSyncStatus: 'not_uploaded' | 'uploaded' | 'processing' | 'ready';
    resumeFileName: string | null;
    resumeUploadedAt: string | null;
};

type SessionUser = {
    id: string;
    name?: string | null;
    email: string;
};

function mapResumeStatus(status: ResumeSyncStatus): ClientProfile['resumeSyncStatus'] {
    if (status === 'READY') {
        return 'ready';
    }
    if (status === 'PROCESSING') {
        return 'processing';
    }
    if (status === 'UPLOADED') {
        return 'uploaded';
    }
    return 'not_uploaded';
}

type PrismaUserProfileWithProjects = Prisma.UserProfileGetPayload<{
    include: {
        projects: true;
    };
}>;

export function toClientProfile(profile: PrismaUserProfileWithProjects): ClientProfile {
    return {
        fullName: profile.fullName,
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        city: profile.city,
        professionalSummary: profile.professionalSummary,
        experiences: profile.experiences,
        knownTechnologies: profile.knownTechnologies,
        softSkills: profile.softSkills,
        certifications: profile.certifications,
        languages: profile.languages,
        projects: profile.projects
            .toSorted((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
            .map((project) => ({
                id: project.id,
                title: project.title,
                shortDescription: project.shortDescription,
                technologies: project.technologies,
                deployUrl: project.deployUrl,
            })),
        resumeSyncStatus: mapResumeStatus(profile.resumeSyncStatus),
        resumeFileName: profile.resumeFileName,
        resumeUploadedAt: profile.resumeUploadedAt?.toISOString() ?? null,
    };
}

export async function getOrCreateUserProfile(user: SessionUser) {
    return prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
            userId: user.id,
            fullName: user.name ?? user.email,
            experiences: [],
            knownTechnologies: [],
            softSkills: [],
            certifications: [],
            languages: [],
            resumeSyncStatus: 'NOT_UPLOADED',
        },
        include: {
            user: {
                select: {
                    officialStudentVerifiedAt: true,
                },
            },
            projects: {
                orderBy: {
                    createdAt: 'asc',
                },
            },
        },
    });
}
