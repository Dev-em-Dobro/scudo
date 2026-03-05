import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import { getData } from 'pdf-parse/worker';

import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { getOrCreateUserProfile, toClientProfile } from '@/app/lib/profile/profile';
import { extractResumeDataFromText } from '@/app/lib/resume/extractor';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

PDFParse.setWorker(getData());

function isValidPdfMagicBytes(fileBuffer: Buffer) {
    const signature = fileBuffer.subarray(0, 5).toString('ascii');
    return signature === '%PDF-';
}

function hasPdfExtension(fileName: string) {
    return fileName.toLowerCase().endsWith('.pdf');
}

export async function POST(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 });
    }

    if (!hasPdfExtension(file.name)) {
        return NextResponse.json({ error: 'Apenas arquivos .pdf são aceitos.' }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Arquivo PDF deve ter até 5MB.' }, { status: 400 });
    }

    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    if (!isValidPdfMagicBytes(fileBuffer)) {
        return NextResponse.json({ error: 'Arquivo rejeitado: assinatura de PDF inválida.' }, { status: 400 });
    }

    const existingProfile = await getOrCreateUserProfile({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });

    const safeFileName = file.name.replaceAll(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 255);

    await prisma.userProfile.update({
        where: { userId: session.user.id },
        data: {
            resumeFileName: safeFileName,
            resumeSyncStatus: 'PROCESSING',
            resumeUploadedAt: new Date(),
        },
    });

    try {
        const parser = new PDFParse({ data: fileBuffer });
        const parsedPdf = await parser.getText();
        await parser.destroy();

        const extracted = extractResumeDataFromText(parsedPdf.text ?? '');

        await prisma.$transaction(async (transaction) => {
            const profile = await transaction.userProfile.findUnique({
                where: { userId: session.user.id },
                select: { id: true },
            });

            if (!profile) {
                throw new Error('Perfil não encontrado para salvar o currículo.');
            }

            await transaction.userProject.deleteMany({
                where: { userProfileId: profile.id },
            });

            if (extracted.projects.length > 0) {
                await transaction.userProject.createMany({
                    data: extracted.projects.map((project) => ({
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
                    fullName: extracted.fullName ?? existingProfile.fullName ?? session.user.name ?? session.user.email,
                    linkedinUrl: extracted.linkedinUrl ?? existingProfile.linkedinUrl,
                    githubUrl: extracted.githubUrl ?? existingProfile.githubUrl,
                    city: extracted.city ?? existingProfile.city,
                    professionalSummary: extracted.professionalSummary ?? existingProfile.professionalSummary,
                    experiences: extracted.experiences.length > 0 ? extracted.experiences : existingProfile.experiences,
                    knownTechnologies: extracted.knownTechnologies,
                    certifications: extracted.certifications.length > 0
                        ? extracted.certifications
                        : existingProfile.certifications,
                    languages: extracted.languages.length > 0 ? extracted.languages : existingProfile.languages,
                    resumeFileName: safeFileName,
                    resumeSyncStatus: 'READY',
                    resumeUploadedAt: new Date(),
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
            throw new Error('Perfil não encontrado após processamento de currículo.');
        }

        return NextResponse.json({
            message: 'Currículo processado com sucesso.',
            profile: toClientProfile(updatedProfile),
        });
    } catch (error) {
        console.error('[resume-upload] Falha ao processar PDF:', error);

        await prisma.userProfile.update({
            where: { userId: session.user.id },
            data: {
                resumeSyncStatus: 'UPLOADED',
                resumeFileName: safeFileName,
                resumeUploadedAt: new Date(),
            },
        });

        return NextResponse.json({
            error: 'Não foi possível processar o conteúdo do PDF.',
        }, { status: 422 });
    }
}
