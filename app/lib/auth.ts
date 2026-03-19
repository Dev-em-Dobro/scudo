import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { sendResetPasswordEmail } from "@/app/lib/email";
import { prisma } from "@/app/lib/prisma";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!betterAuthSecret) {
    throw new Error("BETTER_AUTH_SECRET não está definido no ambiente.");
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
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["email-password", "google", "linkedin"],
            allowDifferentEmails: false,
        },
    },
});
