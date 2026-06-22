import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { sendResetPasswordEmail } from "@/app/lib/email";
import { prisma } from "@/app/lib/prisma";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!betterAuthSecret) {
    throw new Error("BETTER_AUTH_SECRET não está definido no ambiente.");
}

/**
 * Origens confiáveis pro Better Auth (proteção CSRF/origin no sign-in).
 * Inclui as URLs que o Vercel injeta em runtime — cobre o domínio de produção,
 * o alias da branch e a URL imutável do deploy (previews) — além de localhost.
 * Sem isso, o login a partir de scudo-three.vercel.app é recusado quando
 * BETTER_AUTH_URL aponta pra outro host.
 */
function resolveTrustedOrigins(): string[] {
    const origins = new Set<string>();
    const add = (value?: string | null) => {
        if (!value) return;
        origins.add(value.startsWith("http") ? value : `https://${value}`);
    };

    add(process.env.BETTER_AUTH_URL);
    add(process.env.NEXT_PUBLIC_BETTER_AUTH_URL);
    add(process.env.VERCEL_URL);
    add(process.env.VERCEL_BRANCH_URL);
    add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
    add("http://localhost:3000");
    add("http://localhost:3001");

    return Array.from(origins);
}

const socialProviders = {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
        }
        : {}),
    ...(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
        ? {
            linkedin: {
                clientId: process.env.LINKEDIN_CLIENT_ID,
                clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
            },
        }
        : {}),
};

export const auth = betterAuth({
    secret: betterAuthSecret,
    baseURL:
        process.env.BETTER_AUTH_URL ??
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
        "http://localhost:3000",
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true,
        revokeSessionsOnPasswordReset: true,
        resetPasswordTokenExpiresIn: 60 * 30,
        sendResetPassword: async ({ user, url }) => {
            await sendResetPasswordEmail({
                to: user.email,
                name: user.name,
                resetUrl: url,
            });
        },
    },
    socialProviders,
    trustedOrigins: resolveTrustedOrigins(),
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["email-password", "google", "linkedin"],
            allowDifferentEmails: false,
        },
    },
});
