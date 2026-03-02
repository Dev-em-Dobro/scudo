import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'app', 'utils', 'docs', 'exemplo-curriculo-ats.pdf');
        const fileBuffer = await readFile(filePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="exemplo-curriculo-ats.pdf"',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('[resume-example] Falha ao ler PDF de exemplo:', error);

        return NextResponse.json({
            error: 'Não foi possível carregar o PDF de exemplo.',
        }, { status: 404 });
    }
}
