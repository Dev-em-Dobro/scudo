import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { getOrCreateUserProfile, toClientProfile } from '@/app/lib/profile/profile';

export const runtime = 'nodejs';

export async function GET() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const profile = await getOrCreateUserProfile({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });

    return NextResponse.json({
        profile: {
            ...toClientProfile(profile),
            isOfficialStudent: Boolean(profile.user?.officialStudentVerifiedAt),
        },
    });
}

export async function HEAD() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return new NextResponse(null, { status: 401 });
    }

    return new NextResponse(null, { status: 200 });
}

const profilePatchSchema = z.object({
    fullName: z.string().max(120).optional(),
    linkedinUrl: z.string().max(500).optional(),
    githubUrl: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    professionalSummary: z.string().max(3000).optional(),
    experiences: z.array(z.string().max(300)).max(50).optional(),
    knownTechnologies: z.array(z.string().max(80)).max(100).optional(),
    softSkills: z.array(z.string().max(100)).max(100).optional(),
    certifications: z.array(z.string().max(200)).max(50).optional(),
    languages: z.array(z.string().max(100)).max(20).optional(),
    projects: z.array(z.object({
        title: z.string().max(200).optional(),
        shortDescription: z.string().max(1000).optional(),
        technologies: z.array(z.string().max(80)).max(30).optional(),
        deployUrl: z.string().max(500).nullish(),
    })).max(20).optional(),
}).strict();

type ProfilePatchBody = z.infer<typeof profilePatchSchema>;

function normalizeOptionalText(value: unknown) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeUrl(value: unknown) {
    const text = normalizeOptionalText(value);
    if (!text) {
        return null;
    }

    const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;

    try {
        const parsed = new URL(withProtocol);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

function normalizeStringList(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return [...new Set(value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean))];
}

function normalizeTechnologyList(value: unknown) {
    return [...new Set(normalizeStringList(value).map(normalizeTechnology).filter(Boolean))];
}

function normalizeTechnology(value: string) {
    const normalized = value
        .trim()
        .toLowerCase()
        .replaceAll(/[()]/g, '')
        .replaceAll(/\s+/g, ' ');

    const aliases: Record<string, string> = {
        'node.js': 'node',
        'node js': 'node',
        'next.js': 'next',
        'next js': 'next',
        'tailwind css': 'tailwind',
        html5: 'html',
        css3: 'css',
        'javascript es6': 'javascript',
        'javascript es 6': 'javascript',
    };

    return aliases[normalized] ?? normalized;
}

function normalizeProjects(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => {
            if (typeof item !== 'object' || item === null) {
                return null;
            }

            const record = item as {
                title?: unknown;
                shortDescription?: unknown;
                technologies?: unknown;
                deployUrl?: unknown;
            };

            const title = normalizeOptionalText(record.title);
            if (!title) {
                return null;
            }

            const technologies = normalizeStringList(record.technologies).map(normalizeTechnology);

            return {
                title,
                shortDescription: normalizeOptionalText(record.shortDescription),
                technologies,
                deployUrl: normalizeUrl(record.deployUrl),
            };
        })
        .filter((project): project is {
            title: string;
            shortDescription: string | null;
            technologies: string[];
            deployUrl: string | null;
        } => project !== null);
}

function deriveKnownTechnologiesFromProjects(projects: { technologies: string[] }[]) {
    return [...new Set(projects.flatMap((project) => project.technologies).map(normalizeTechnology).filter(Boolean))];
}

export async function PATCH(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = profilePatchSchema.safeParse(rawBody);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Dados inválidos.', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const payload: ProfilePatchBody = parsed.data;

    await getOrCreateUserProfile({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });

    const projects = normalizeProjects(payload.projects);
    const projectKnownTechnologies = deriveKnownTechnologiesFromProjects(projects);
    const manualKnownTechnologies = normalizeTechnologyList(payload.knownTechnologies);
    const knownTechnologies = [...new Set([...manualKnownTechnologies, ...projectKnownTechnologies])];
    const softSkills = normalizeStringList(payload.softSkills);

    await prisma.$transaction(async (transaction) => {
        const profile = await transaction.userProfile.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        });

        if (!profile) {
            throw new Error('Perfil não encontrado para atualização.');
        }

        await transaction.userProject.deleteMany({
            where: { userProfileId: profile.id },
        });

        if (projects.length > 0) {
            await transaction.userProject.createMany({
                data: projects.map((project) => ({
                    userProfileId: profile.id,
                    title: project.title,
                    shortDescription: project.shortDescription,
                    technologies: project.technologies,
                    deployUrl: project.deployUrl,
                })),
            });
        }

        await transaction.userProfile.update({
            where: { userId: session.user.id },
            data: {
                fullName: normalizeOptionalText(payload.fullName),
                linkedinUrl: normalizeUrl(payload.linkedinUrl),
                githubUrl: normalizeUrl(payload.githubUrl),
                city: normalizeOptionalText(payload.city),
                professionalSummary: normalizeOptionalText(payload.professionalSummary),
                experiences: normalizeStringList(payload.experiences),
                knownTechnologies,
                softSkills,
                certifications: normalizeStringList(payload.certifications),
                languages: normalizeStringList(payload.languages),
            },
        });
    });

    const updatedProfile = await prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        include: {
            projects: {
                orderBy: {
                    createdAt: 'asc',
                },
            },
        },
    });

    if (!updatedProfile) {
        return NextResponse.json({ error: 'Não foi possível encontrar o perfil atualizado.' }, { status: 404 });
    }

    return NextResponse.json({
        message: 'Perfil atualizado com sucesso.',
        profile: toClientProfile(updatedProfile),
    });
}

export async function DELETE() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    await getOrCreateUserProfile({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });

    const clearedProfile = await prisma.userProfile.update({
        where: { userId: session.user.id },
        data: {
            fullName: null,
            linkedinUrl: null,
            githubUrl: null,
            city: null,
            professionalSummary: null,
            experiences: [],
            knownTechnologies: [],
            softSkills: [],
            certifications: [],
            languages: [],
            projects: {
                deleteMany: {},
            },
            resumeFileName: null,
            resumeUploadedAt: null,
            resumeSyncStatus: 'NOT_UPLOADED',
        },
        include: {
            projects: {
                orderBy: {
                    createdAt: 'asc',
                },
            },
        },
    });

    return NextResponse.json({
        message: 'Dados pessoais do perfil removidos com sucesso.',
        profile: toClientProfile(clearedProfile),
    });
}

export async function POST(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { action?: string };

    if (body.action !== 'export') {
        return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    const profile = await getOrCreateUserProfile({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });

    return NextResponse.json({
        exportedAt: new Date().toISOString(),
        user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
        },
        profile: toClientProfile(profile),
    });
}
