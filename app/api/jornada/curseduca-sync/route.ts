import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/app/lib/auth";
import { getUserJornadaSnapshot, isOfficialStudentUser } from "@/app/lib/jornada/service";
import {
    checkUserRateLimit,
    RATE_LIMIT_RULES,
    rateLimitResponse,
} from "@/app/lib/security/rateLimit";
import { syncCurseducaProgressForUser } from "@/app/lib/jornada/curseducaSync";

export const runtime = "nodejs";
/** Sync grande é fatiado; cada invocação precisa caber no limite do plano. */
export const maxDuration = 60;

export async function POST() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const isOfficialStudent = await isOfficialStudentUser(session.user.id);
    if (!isOfficialStudent) {
        return NextResponse.json(
            { error: "A jornada está disponível apenas para alunos oficiais." },
            { status: 403 },
        );
    }

    const rateLimit = checkUserRateLimit(session.user.id, "jornadaCurseducaSync", RATE_LIMIT_RULES.jornadaCurseducaSync);
    if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit);
    }

    try {
        const result = await syncCurseducaProgressForUser(session.user.id, {
            writeBudgetMs: 40_000,
            maxCreatesPerRun: 250,
        });

        // Snapshot leve só no fim: evita CodeQuest + trabalho extra enquanto ainda há fatias.
        const snapshot = result.incomplete
            ? null
            : await getUserJornadaSnapshot(session.user.id, {
                includeCodeQuest: false,
            });

        return NextResponse.json({
            ok: true,
            result,
            incomplete: result.incomplete,
            snapshot,
        });
    } catch (error) {
        console.error("[jornada/curseduca-sync] Falha ao sincronizar progresso da Curseduca:", error);
        return NextResponse.json(
            {
                ok: false,
                error:
                    "Não foi possível sincronizar agora. Tente novamente em instantes. Se persistir, entre em contato com o suporte.",
            },
            { status: 503 },
        );
    }
}
