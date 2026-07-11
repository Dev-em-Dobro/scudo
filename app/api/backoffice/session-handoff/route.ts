import { NextRequest, NextResponse } from "next/server";

import { verifyHandoffToken } from "@/app/lib/backoffice-handoff";
import { setBetterAuthSessionCookie } from "@/app/lib/backoffice-session-cookie";
import { prisma } from "@/app/lib/prisma";

type ImpersonationTicketRow = {
  id: string;
  token: string;
  sessionToken: string;
  targetUserId: string;
  operatorEmail: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

async function resolveSession(sessionToken: string) {
  return prisma.session.findFirst({
    where: { token: sessionToken },
    select: { token: true, expiresAt: true },
  });
}

/**
 * Consome handoff de personificação criado pelo scudo-backoffice.
 * Preferência: ?token= (JWT assinado). Legado: ?ticket= (ImpersonationTicket no DB).
 */
export async function GET(request: NextRequest) {
  const jwtToken = request.nextUrl.searchParams.get("token");
  const legacyTicket = request.nextUrl.searchParams.get("ticket");

  if (!jwtToken && !legacyTicket) {
    return NextResponse.json({ error: "Token ausente." }, { status: 400 });
  }

  let sessionToken: string | null = null;

  if (jwtToken) {
    try {
      const payload = verifyHandoffToken(jwtToken);
      sessionToken = payload.sessionToken;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Token inválido.";
      return NextResponse.json({ error: message }, { status: 401 });
    }
  } else if (legacyTicket) {
    const rows = await prisma.$queryRaw<ImpersonationTicketRow[]>`
      SELECT id, token, "sessionToken", "targetUserId", "operatorEmail", "expiresAt", "consumedAt"
      FROM "ImpersonationTicket"
      WHERE token = ${legacyTicket}
      LIMIT 1
    `;

    const entry = rows[0];
    if (!entry) {
      return NextResponse.json({ error: "Ticket inválido." }, { status: 404 });
    }

    if (entry.consumedAt) {
      return NextResponse.json({ error: "Ticket já utilizado." }, { status: 410 });
    }

    if (entry.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Ticket expirado." }, { status: 410 });
    }

    sessionToken = entry.sessionToken;

    await prisma.$executeRaw`
      UPDATE "ImpersonationTicket"
      SET "consumedAt" = NOW()
      WHERE id = ${entry.id}
    `;
  }

  if (!sessionToken) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 410 });
  }

  const session = await resolveSession(sessionToken);
  if (!session || session.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 410 });
  }

  const redirectUrl = new URL("/", request.url);
  const response = NextResponse.redirect(redirectUrl);
  await setBetterAuthSessionCookie(response, session.token, session.expiresAt);

  return response;
}
