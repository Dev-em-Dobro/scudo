import { JobLevel, JobSource } from '@prisma/client';

import { prisma } from '@/app/lib/prisma';

const JOB_BOARD_STACK_FILTER = [
    'frontend',
    'backend',
    'fullstack',
    'javascript',
    'typescript',
    'python',
    'react',
    'next',
    'node',
    'express',
    'nestjs',
    'ia',
    'automacao',
    'n8n',
    'make',
    'low-code',
    'no-code',
    'openai',
    'llm',
    'langchain',
];

const BASE_JOB_SELECT = {
    id: true,
    title: true,
    companyName: true,
    level: true,
    stack: true,
    location: true,
    isRemote: true,
    publishedAt: true,
    source: true,
    sourceUrl: true,
    createdAt: true,
} as const;

const JOB_MAX_AGE_IN_MONTHS = 6;

function getPublishedCutoffDate() {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - JOB_MAX_AGE_IN_MONTHS);
    return cutoff;
}

function buildRecentJobsWhere() {
    const cutoff = getPublishedCutoffDate();
    return {
        OR: [
            { publishedAt: { gte: cutoff } },
            { publishedAt: null, createdAt: { gte: cutoff } },
        ],
    };
}

export async function getAllAvailableJobs() {
    return prisma.job.findMany({
        where: buildRecentJobsWhere(),
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        select: BASE_JOB_SELECT,
    });
}

export async function getJobBoardJobs() {
    return prisma.job.findMany({
        where: {
            ...buildRecentJobsWhere(),
            source: {
                in: [JobSource.GUPY, JobSource.OTHER],
            },
            level: { in: [JobLevel.ESTAGIO, JobLevel.JUNIOR, JobLevel.PLENO, JobLevel.OUTRO] },
            OR: [
                {
                    stack: {
                        hasSome: JOB_BOARD_STACK_FILTER,
                    },
                },
                {
                    stack: {
                        isEmpty: true,
                    },
                },
            ],
        },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        select: BASE_JOB_SELECT,
    });
}
