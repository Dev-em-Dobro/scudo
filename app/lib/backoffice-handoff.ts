import { createHmac, timingSafeEqual } from "node:crypto";

export type HandoffPayload = {
  sessionToken: string;
  targetUserId: string;
  operatorEmail: string;
  exp: number;
};

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function handoffSecret() {
  return (
    process.env.BACKOFFICE_HANDOFF_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    ""
  );
}

export function verifyHandoffToken(token: string): HandoffPayload {
  const secret = handoffSecret();
  if (!secret) {
    throw new Error("BACKOFFICE_HANDOFF_SECRET não está definido.");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Token inválido.");
  }

  const [header, body, signature] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error("Assinatura inválida.");
  }

  const payload = JSON.parse(base64UrlDecode(body)) as HandoffPayload;

  if (!payload.sessionToken || !payload.targetUserId || !payload.operatorEmail) {
    throw new Error("Payload incompleto.");
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new Error("Token expirado.");
  }

  return payload;
}
