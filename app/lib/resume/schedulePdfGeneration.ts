import { after } from 'next/server';

import { generateAtsResumePdf } from '@/app/lib/resume/generatePdf';
import { parseGeneratedResumeDocument } from '@/app/lib/resume/syncGeneratedResume';
import { withRlsUserContext } from '@/app/lib/rls';

export async function regenerateGeneratedResumePdfForUser(userId: string): Promise<void> {
    await withRlsUserContext(userId, async (transaction) => {
        const profile = await transaction.userProfile.findUnique({
            where: { userId },
            select: {
                id: true,
                generatedResumeJson: true,
            },
        });

        if (!profile?.generatedResumeJson) {
            return;
        }

        const document = parseGeneratedResumeDocument(profile.generatedResumeJson);
        if (!document) {
            return;
        }

        const pdfBytes = await generateAtsResumePdf(document);

        await transaction.userProfile.update({
            where: { id: profile.id },
            data: {
                generatedResumePdf: Buffer.from(pdfBytes),
            },
        });
    });
}

/**
 * Gera o PDF fora do caminho crítico da request (ex.: conclusão de rank na jornada).
 */
export function scheduleGeneratedResumePdfGeneration(userId: string) {
    after(async () => {
        try {
            await regenerateGeneratedResumePdfForUser(userId);
        } catch (error) {
            console.error('[resume-pdf] Falha na geração assíncrona do PDF.', {
                userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    });
}
