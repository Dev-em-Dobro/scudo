"use client";

import { createAuthClient } from "better-auth/react";

function resolveAuthBaseUrl() {
  // No browser, sempre usar a origem da própria página — garante que o login
  // (POST /api/auth/...) seja SAME-ORIGIN. Evita CORS quando a URL muda:
  // porta diferente em dev (3001) ou domínio de preview no Vercel
  // (scudo-three.vercel.app etc.), onde um NEXT_PUBLIC_BETTER_AUTH_URL fixo
  // apontaria pra outro host e o navegador bloquearia a requisição.
  if (globalThis.window !== undefined) {
    return globalThis.window.location.origin;
  }

  // SSR/prerender: cai nas envs (não há janela aqui).
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
});

export const { signIn, signOut, signUp, useSession } = authClient;
