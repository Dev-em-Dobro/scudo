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

export async function getAllAvailableJobs() {
    return prisma.job.findMany({
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        select: BASE_JOB_SELECT,
    });
}

export async function getJobBoardJobs() {
    return prisma.job.findMany({
        where: {
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
