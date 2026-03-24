import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { getData } from 'pdf-parse/worker';

import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { getOrCreateUserProfile, toClientProfile } from '@/app/lib/profile/profile';
import { evaluateResumeExtractionQuality, extractResumeDataFromText, normalizeResumeInputText, type ResumeSourceHint } from '@/app/lib/resume/extractor';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

PDFParse.setWorker(getData());

function isValidPdfMagicBytes(fileBuffer: Buffer) {
    const signature = fileBuffer.subarray(0, 5).toString('ascii');
    return signature === '%PDF-';
}

function isValidDocxMagicBytes(fileBuffer: Buffer) {
    const signature = fileBuffer.subarray(0, 4).toString('binary');
    return signature === 'PK\u0003\u0004' || signature === 'PK\u0005\u0006' || signature === 'PK\u0007\u0008';
}

function getFileExtension(fileName: string) {
    const parts = fileName.toLowerCase().split('.');
    const extension = parts.at(-1);
    return extension ?? '';
}

function isSupportedResumeExtension(extension: string) {
    return extension === 'pdf' || extension === 'docx';
}

function detectPdfSourceHintFromInfo(rawInfo: unknown): ResumeSourceHint | undefined {
    if (!rawInfo || typeof rawInfo !== 'object') {
        return undefined;
    }

    const info = rawInfo as Record<string, unknown>;
    const candidates = [info.Author, info.Creator, info.Producer, info.Title, info.Subject]
        .filter((value): value is string => typeof value === 'string')
        .join(' ')
        .toLowerCase();

    if (!candidates) {
        return undefined;
    }

    const isLinkedin = candidates.includes('linkedin')
        || candidates.includes('resume generated from profile')
        || candidates.includes('curriculum vitae generated from profile');

    return isLinkedin ? 'linkedin-export' : undefined;
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

    const fileExtension = getFileExtension(file.name);

    if (!isSupportedResumeExtension(fileExtension)) {
        return NextResponse.json({ error: 'Apenas arquivos .pdf ou .docx são aceitos.' }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Arquivo deve ter até 5MB.' }, { status: 400 });
    }

    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    if (fileExtension === 'pdf' && !isValidPdfMagicBytes(fileBuffer)) {
        return NextResponse.json({ error: 'Arquivo rejeitado: assinatura de PDF inválida.' }, { status: 400 });
    }

    if (fileExtension === 'docx' && !isValidDocxMagicBytes(fileBuffer)) {
        return NextResponse.json({ error: 'Arquivo rejeitado: assinatura de DOCX inválida.' }, { status: 400 });
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
        let extractedText = '';
        let sourceHintOverride: ResumeSourceHint | undefined;

        if (fileExtension === 'pdf') {
            const parser = new PDFParse({ data: fileBuffer });
            const parsedPdf = await parser.getText();
            const pdfInfo = await parser.getInfo();
            await parser.destroy();
            extractedText = parsedPdf.text ?? '';
            sourceHintOverride = detectPdfSourceHintFromInfo(pdfInfo.info);
        } else {
            const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
            extractedText = docxResult.value ?? '';
        }

        const normalizedResume = normalizeResumeInputText(extractedText, sourceHintOverride);
        const extracted = extractResumeDataFromText(normalizedResume.text);
        const extractionQuality = evaluateResumeExtractionQuality(extracted, normalizedResume.sourceHint);

        if (!extractionQuality.isReliable) {
            await prisma.userProfile.update({
                where: { userId: session.user.id },
                data: {
                    resumeSyncStatus: 'UPLOADED',
                    resumeFileName: safeFileName,
                    resumeUploadedAt: new Date(),
                },
            });

            return NextResponse.json({
                message: 'Arquivo recebido, mas não foi possível extrair dados com confiança. Revise manualmente no perfil.',
                extraction: {
                    sourceHint: normalizedResume.sourceHint,
                    confidenceScore: extractionQuality.score,
                    missingFields: extractionQuality.missingFields,
                },
            }, { status: 202 });
        }

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
            extraction: {
                sourceHint: normalizedResume.sourceHint,
                confidenceScore: extractionQuality.score,
                missingFields: extractionQuality.missingFields,
            },
            profile: toClientProfile(updatedProfile),
        });
    } catch (error) {
        console.error('[resume-upload] Falha ao processar currículo:', error);

        await prisma.userProfile.update({
            where: { userId: session.user.id },
            data: {
                resumeSyncStatus: 'UPLOADED',
                resumeFileName: safeFileName,
                resumeUploadedAt: new Date(),
            },
        });

        return NextResponse.json({
            error: 'Não foi possível processar o conteúdo do arquivo.',
        }, { status: 422 });
    }
}
