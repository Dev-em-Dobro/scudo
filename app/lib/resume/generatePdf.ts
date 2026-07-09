import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import type { AtsResumeDocument, AtsResumeTechnologyGroups } from '@/app/lib/resume/types';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 48;
const LINE_HEIGHT = 14;
const SECTION_GAP = 10;

/** StandardFonts (Helvetica) usam WinAnsi — remove caracteres fora do Latin-1. */
function toPdfSafeText(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\t\n\r\u0020-\u007e\u00a0-\u00ff]/g, '');
}

function wrapText(text: string, maxWidth: number, font: Awaited<ReturnType<PDFDocument['embedFont']>>, fontSize: number) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(candidate, fontSize);

        if (width <= maxWidth) {
            currentLine = candidate;
            continue;
        }

        if (currentLine) {
            lines.push(currentLine);
        }
        currentLine = word;
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
}

type PdfWriter = {
    doc: PDFDocument;
    page: ReturnType<PDFDocument['addPage']>;
    y: number;
    regularFont: Awaited<ReturnType<PDFDocument['embedFont']>>;
    boldFont: Awaited<ReturnType<PDFDocument['embedFont']>>;
};

function ensureSpace(writer: PdfWriter, requiredHeight: number) {
    if (writer.y - requiredHeight >= MARGIN_BOTTOM) {
        return;
    }

    writer.page = writer.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    writer.y = PAGE_HEIGHT - MARGIN_TOP;
}

function drawLine(
    writer: PdfWriter,
    text: string,
    options?: { bold?: boolean; size?: number; indent?: number },
) {
    const safeText = toPdfSafeText(text);
    if (!safeText.trim()) {
        return;
    }

    const fontSize = options?.size ?? 11;
    const font = options?.bold ? writer.boldFont : writer.regularFont;
    const maxWidth = PAGE_WIDTH - MARGIN_X * 2 - (options?.indent ?? 0);
    const lines = wrapText(safeText, maxWidth, font, fontSize);

    for (const line of lines) {
        ensureSpace(writer, LINE_HEIGHT);
        writer.page.drawText(line, {
            x: MARGIN_X + (options?.indent ?? 0),
            y: writer.y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
        });
        writer.y -= LINE_HEIGHT;
    }
}

function drawSectionTitle(writer: PdfWriter, title: string) {
    writer.y -= SECTION_GAP;
    drawLine(writer, title, { bold: true, size: 12 });
    writer.y -= 2;
}

function formatTechnologyGroups(groups: AtsResumeTechnologyGroups): string[] {
    const labels: Record<keyof AtsResumeTechnologyGroups, string> = {
        languages: 'Linguagens',
        frontend: 'Frontend',
        backend: 'Backend',
        database: 'Banco de Dados',
        cloud: 'Cloud',
        tools: 'Ferramentas',
        methodologies: 'Metodologias',
    };

    return (Object.keys(labels) as Array<keyof AtsResumeTechnologyGroups>)
        .filter((key) => groups[key].length > 0)
        .map((key) => `${labels[key]}: ${groups[key].join(', ')}`);
}

function buildHeaderLine(document: AtsResumeDocument): string {
    const parts = [
        document.header.city,
        document.header.email,
        document.header.linkedinUrl ? `LinkedIn: ${document.header.linkedinUrl}` : null,
        document.header.githubUrl ? `GitHub: ${document.header.githubUrl}` : null,
    ].filter(Boolean);

    return parts.join(' | ');
}

export async function generateAtsResumePdf(document: AtsResumeDocument): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const regularFont = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    const writer: PdfWriter = {
        doc,
        page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
        y: PAGE_HEIGHT - MARGIN_TOP,
        regularFont,
        boldFont,
    };

    drawLine(writer, document.header.fullName, { bold: true, size: 16 });
    drawLine(writer, buildHeaderLine(document), { size: 10 });

    drawSectionTitle(writer, 'RESUMO PROFISSIONAL');
    if (document.professionalSummary) {
        drawLine(writer, document.professionalSummary);
    }

    if (document.experiences.length > 0) {
        drawSectionTitle(writer, 'EXPERIÊNCIA PROFISSIONAL');
        for (const experience of document.experiences) {
            drawLine(writer, experience);
            writer.y -= 4;
        }
    }

    if (document.projects.length > 0) {
        drawSectionTitle(writer, 'PROJETOS');
        for (const project of document.projects) {
            drawLine(writer, project.title, { bold: true });
            if (project.description) {
                drawLine(writer, project.description, { indent: 8 });
            }
            if (project.technologies.length > 0) {
                drawLine(writer, `Tech stacks: ${project.technologies.join(', ')}`, { indent: 8, size: 10 });
            }
            writer.y -= 4;
        }
    }

    if (document.education.length > 0) {
        drawSectionTitle(writer, 'FORMAÇÃO ACADÊMICA');
        for (const item of document.education) {
            drawLine(writer, item);
        }
    }

    const techLines = formatTechnologyGroups(document.technologyGroups);
    if (techLines.length > 0) {
        drawSectionTitle(writer, 'STACKS CONHECIDAS');
        for (const line of techLines) {
            drawLine(writer, line);
        }
    }

    if (document.certifications.length > 0) {
        drawSectionTitle(writer, 'CERTIFICAÇÕES');
        for (const certification of document.certifications) {
            drawLine(writer, certification);
        }
    }

    if (document.languages.length > 0) {
        drawSectionTitle(writer, 'IDIOMAS');
        for (const language of document.languages) {
            drawLine(writer, language);
        }
    }

    return doc.save();
}
