import type { NextResponse } from "next/server";

/**
 * Assina valor de cookie igual ao better-call / Better Auth.
 * Formato: encodeURIComponent(`${value}.${base64HmacSha256}`)
 */
async function signCookieValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return encodeURIComponent(`${value}.${base64}`);
}

function resolveSessionCookieName() {
  const baseURL =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000";
  const secure = baseURL.startsWith("https://");
  return secure
    ? "__Secure-better-auth.session_token"
    : "better-auth.session_token";
}

export async function setBetterAuthSessionCookie(
  response: NextResponse,
  sessionToken: string,
  expiresAt: Date,
) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET não está definido.");
  }

  const cookieName = resolveSessionCookieName();
  const secure = cookieName.startsWith("__Secure-");
  const maxAge = Math.max(
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    1,
  );
  const signedValue = await signCookieValue(sessionToken, secret);

  const parts = [
    `${cookieName}=${signedValue}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");

  response.headers.append("Set-Cookie", parts.join("; "));
}
