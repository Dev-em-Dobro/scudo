import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { getData } from 'pdf-parse/worker';

import { auth } from '@/app/lib/auth';
import {
    getResumeAiConfidenceThreshold,
    getResumeAiProviderOrder,
    isResumeAiExtractionEnabled,
    isResumeAiStrictPiiSanitizationEnabled,
} from '@/app/lib/featureFlags';
import { prisma } from '@/app/lib/prisma';
import { getOrCreateUserProfile, toClientProfile } from '@/app/lib/profile/profile';
import { evaluateResumeExtractionQuality, extractResumeDataFromText, normalizeResumeInputText, type ResumeSourceHint } from '@/app/lib/resume/extractor';
import { extractResumeDataWithAiFirst } from '@/app/lib/resume/resumeAi';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_LIMITS = {
    fullName: 120,
    linkedinUrl: 500,
    githubUrl: 500,
    city: 100,
    professionalSummary: 3000,
    experiencesItem: 300,
    knownTechnologiesItem: 80,
    certificationsItem: 200,
    languagesItem: 100,
    projectsTitle: 200,
    projectsShortDescription: 1000,
    projectsTechnologyItem: 80,
};

function truncateText(value: string, maxLength: number) {
    const trimmed = value.trim();
    return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength).trim();
}

function normalizeListWithLimit(value: string[], maxItemLength: number, maxItems: number) {
    const unique = [...new Set(value.map((item) => truncateText(item, maxItemLength)).filter(Boolean))];
    return unique.slice(0, maxItems);
}

function normalizeOptionalTextWithLimit(value: string | null, maxLength: number) {
    if (!value) {
        return null;
    }

    const truncated = truncateText(value, maxLength);
    return truncated.length > 0 ? truncated : null;
}

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

async function extractResumeWithConfiguredStrategy(normalizedText: string) {
    const deterministicExtracted = extractResumeDataFromText(normalizedText);

    if (!isResumeAiExtractionEnabled()) {
        console.warn('[resume-upload] Extração AI desabilitada; usando extração determinística.');
        return {
            extracted: deterministicExtracted,
            extractionStrategy: 'fallback' as const,
            aiProviderUsed: null as 'openai' | 'gemini' | null,
            aiFallbackReason: null as string | null,
        };
    }

    const aiResult = await extractResumeDataWithAiFirst({
        resumeText: normalizedText,
        fallbackData: deterministicExtracted,
        providers: getResumeAiProviderOrder(),
        confidenceThreshold: getResumeAiConfidenceThreshold(),
        strictPiiSanitization: isResumeAiStrictPiiSanitizationEnabled(),
    });

    if (aiResult.strategy === 'fallback') {
        console.warn('[resume-upload] Falha no uso da IA; fallback determinístico aplicado.', {
            fallbackReason: aiResult.fallbackReason,
        });
    }

    return {
        extracted: aiResult.data,
        extractionStrategy: aiResult.strategy,
        aiProviderUsed: aiResult.providerUsed,
        aiFallbackReason: aiResult.fallbackReason,
    };
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
        const { extracted, extractionStrategy, aiProviderUsed, aiFallbackReason } =
            await extractResumeWithConfiguredStrategy(normalizedResume.text);

        const extractionQuality = evaluateResumeExtractionQuality(extracted, normalizedResume.sourceHint);

        const normalizedProjects = extracted.projects
            .map((project) => {
                const title = truncateText(project.title, PROFILE_LIMITS.projectsTitle);
                if (!title) {
                    return null;
                }

                return {
                    title,
                    shortDescription: normalizeOptionalTextWithLimit(project.shortDescription, PROFILE_LIMITS.projectsShortDescription),
                    technologies: normalizeListWithLimit(project.technologies, PROFILE_LIMITS.projectsTechnologyItem, 30),
                    deployUrl: project.deployUrl,
                };
            })
            .filter((project): project is {
                title: string;
                shortDescription: string | null;
                technologies: string[];
                deployUrl: string | null;
            } => project !== null)
            .slice(0, 20);

        const normalizedKnownTechnologies = normalizeListWithLimit(extracted.knownTechnologies, PROFILE_LIMITS.knownTechnologiesItem, 100);
        const normalizedExperiences = normalizeListWithLimit(extracted.experiences, PROFILE_LIMITS.experiencesItem, 50);
        const normalizedCertifications = normalizeListWithLimit(extracted.certifications, PROFILE_LIMITS.certificationsItem, 50);
        const normalizedLanguages = normalizeListWithLimit(extracted.languages, PROFILE_LIMITS.languagesItem, 20);

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
                    strategy: extractionStrategy,
                    aiProviderUsed,
                    aiFallbackReason,
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

            if (normalizedProjects.length > 0) {
                await transaction.userProject.createMany({
                    data: normalizedProjects.map((project) => ({
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
                    fullName: normalizeOptionalTextWithLimit(
                        extracted.fullName ?? existingProfile.fullName ?? session.user.name ?? session.user.email,
                        PROFILE_LIMITS.fullName,
                    ),
                    linkedinUrl: normalizeOptionalTextWithLimit(extracted.linkedinUrl ?? existingProfile.linkedinUrl, PROFILE_LIMITS.linkedinUrl),
                    githubUrl: normalizeOptionalTextWithLimit(extracted.githubUrl ?? existingProfile.githubUrl, PROFILE_LIMITS.githubUrl),
                    city: normalizeOptionalTextWithLimit(extracted.city ?? existingProfile.city, PROFILE_LIMITS.city),
                    professionalSummary: normalizeOptionalTextWithLimit(
                        extracted.professionalSummary ?? existingProfile.professionalSummary,
                        PROFILE_LIMITS.professionalSummary,
                    ),
                    experiences: normalizedExperiences.length > 0 ? normalizedExperiences : existingProfile.experiences,
                    knownTechnologies: normalizedKnownTechnologies,
                    certifications: normalizedCertifications.length > 0
                        ? normalizedCertifications
                        : existingProfile.certifications,
                    languages: normalizedLanguages.length > 0 ? normalizedLanguages : existingProfile.languages,
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
                strategy: extractionStrategy,
                aiProviderUsed,
                aiFallbackReason,
            },
            profile: toClientProfile(updatedProfile),
        });
    } catch (error) {
        console.error('[resume-upload] Falha ao processar currículo', {
            error: error instanceof Error ? error.message : 'unknown_error',
        });

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
