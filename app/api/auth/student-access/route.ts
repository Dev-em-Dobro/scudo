// Adicionar import do auth no topo
import { auth } from "@/app/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

import { prisma } from "@/app/lib/prisma";
import { sendStudentAccessEmail } from "@/app/lib/email";

export const runtime = "nodejs";

interface ExternalStudentData {
    uuid: string;
    id: number;
    name: string;
    email: string;
    image: string;
    lastLogin: string;
    phones: Record<string, unknown>;
}

/**
 * Gera uma senha segura de 12 caracteres que satisfaz os requisitos do sistema:
 * - Ao menos uma letra minúscula
 * - Ao menos uma letra maiúscula
 * - Ao menos um número
 */
function generateSecurePassword(): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const all = lowercase + uppercase + numbers;

    const bytes = crypto.randomBytes(16);

    const arr: string[] = [
        lowercase[bytes[0] % lowercase.length],
        uppercase[bytes[1] % uppercase.length],
        numbers[bytes[2] % numbers.length],
    ];

    for (let i = 3; i < 12; i++) {
        arr.push(all[bytes[i] % all.length]);
    }

    // Fisher-Yates shuffle com bytes aleatórios
    const shuffleBytes = crypto.randomBytes(arr.length);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = shuffleBytes[i] % (i + 1);
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }

    return arr.join("");
}

/**
 * Valida o e-mail contra a API externa da plataforma de aulas.
 * Retorna os dados do aluno ou null caso não encontrado.
 */
async function validateStudentEmail(
    email: string
): Promise<ExternalStudentData | null> {
    const baseUrl = process.env.USER_API_BASE_URL;
    const token = process.env.AUTHORIZATION_TOKEN ?? "";
    const apiKey = process.env.API_KEY_HEADER ?? "";

    if (!baseUrl) {
        throw new Error("USER_API_BASE_URL não está configurado.");
    }

    // Garante que as credenciais estão presentes para evitar falsos 401 silenciosos
    if (!token || !apiKey) {
        throw new Error("Credenciais da API externa (AUTHORIZATION_TOKEN / API_KEY_HEADER) não configuradas.");
    }

    const url = `${baseUrl}/members/by?email=${encodeURIComponent(email)}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            api_key: apiKey,
        },
        signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 200) {
        return response.json() as Promise<ExternalStudentData>;
    }

    if (response.status === 404) {
        // Aluno não encontrado na plataforma externa
        return null;
    }

    // 401, 403, 5xx — erro de serviço externo; não deve ser silenciado como "não aluno"
    throw new Error(`Falha na API externa: status ${response.status}`);
}

export async function POST(request: NextRequest) {
    // --- Parsear body ---
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Corpo da requisição inválido." },
            { status: 400 }
        );
    }

    const rawEmail =
        typeof (body as Record<string, unknown>).email === "string"
            ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
            : null;

    // --- Validação básica do e-mail ---
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    // --- 1. Validar contra API externa ---
    let studentData: ExternalStudentData | null = null;
    try {
        studentData = await validateStudentEmail(rawEmail);
    } catch (err) {
        console.error("[student-access] Erro na validação externa:", err);
        return NextResponse.json(
            {
                error: "Não foi possível validar o e-mail no momento. Tente novamente mais tarde.",
            },
            { status: 503 }
        );
    }

    // --- 2. E-mail não encontrado na plataforma de aulas ---
    if (!studentData) {
        return NextResponse.json({ status: "not_student" });
    }

    // --- 3. Verificar se o aluno já possui conta no Scudo ---
    const existingUser = await prisma.user.findUnique({
        where: { email: rawEmail },
        select: { id: true },
    });

    if (existingUser) {
        return NextResponse.json({ status: "existing_user" });
    }

    // --- 4. Gerar senha e criar conta via Better Auth ---
    const generatedPassword = generateSecurePassword();
    const authBaseUrl =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000";

    try {
        await auth.api.signUpEmail({
            body: {
                name: studentData.name,
                email: rawEmail, // usa o e-mail já normalizado (lowercase) em vez do retornado pela API
                password: generatedPassword,
            },
        });

        await prisma.user.update({
            where: { email: rawEmail },
            data: { officialStudentVerifiedAt: new Date() },
        });
    } catch (err) {
        console.error("[student-access] Falha ao criar conta:", err);
        return NextResponse.json(
            { error: "Não foi possível criar sua conta. Tente novamente." },
            { status: 500 }
        );
    }

    // --- 5. Enviar e-mail com as credenciais ---
    const loginUrl = `${authBaseUrl}/login`;
    
    try {
        await sendStudentAccessEmail({
            to: rawEmail, // mantém consistência com o e-mail normalizado usado no cadastro
            name: studentData.name,
            password: generatedPassword,
            loginUrl,
        });
    } catch (err) {
        console.error("[student-access] Falha ao enviar e-mail:", err);
        // A conta foi criada com sucesso — não falha o fluxo, apenas avisa
        return NextResponse.json({
            status: "created",
            emailSent: false,
            warning:
                "Sua conta foi criada, mas não foi possível enviar o e-mail com a senha. Entre em contato com o suporte.",
        });
    }

    return NextResponse.json({ status: "created", emailSent: true });
}
