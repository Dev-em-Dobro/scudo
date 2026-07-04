import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

const DEFAULT_OUTPUT_PATH = "prisma/seed-data/user-seed.json";

const sourceDatabaseUrl =
    (process.env.SEED_SOURCE_DATABASE_URL ?? process.env.DATABASE_URL ?? "").trim();
const seedUserEmail = (process.env.SEED_USER_EMAIL ?? "").trim().toLowerCase();
const outputPath = path.resolve(
    process.cwd(),
    process.env.SEED_OUTPUT_PATH ?? DEFAULT_OUTPUT_PATH,
);

if (!sourceDatabaseUrl) {
    throw new Error(
        "SEED_SOURCE_DATABASE_URL (ou DATABASE_URL) não foi definido para exportar o seed.",
    );
}

if (!seedUserEmail) {
    throw new Error("SEED_USER_EMAIL é obrigatório para exportar o seed do usuário.");
}

const client = new Client({ connectionString: sourceDatabaseUrl });

const fetchOne = async (query, params) => {
    const result = await client.query(query, params);
    return result.rows[0] ?? null;
};

const fetchMany = async (query, params) => {
    const result = await client.query(query, params);
    return result.rows;
};

const main = async () => {
    await client.connect();

    try {
        const user = await fetchOne(
            `
            select
                id,
                name,
                email,
                "emailVerified",
                image,
                "createdAt",
                "updatedAt",
                "officialStudentVerifiedAt",
                "curseducaMemberId",
                "curseducaMemberSlug",
                "curseducaMemberUuid",
                "curseducaSyncNeedsRetry"
            from "User"
            where lower(email) = lower($1)
            limit 1
            `,
            [seedUserEmail],
        );

        if (!user) {
            throw new Error(`Usuário com e-mail ${seedUserEmail} não encontrado.`);
        }

        // Não exportamos Session para evitar cópia de tokens e sessões ativas de produção.
        const [accounts, profile, jornadaTaskProgress, onboardingProgress, productFeedbacks] =
            await Promise.all([
                fetchMany(
                    `
                    select
                        id,
                        "accountId",
                        "providerId",
                        password,
                        "createdAt",
                        "updatedAt"
                    from "Account"
                    where "userId" = $1
                    order by "createdAt" asc
                    `,
                    [user.id],
                ),
                fetchOne(
                    `
                    select
                        id,
                        "fullName",
                        "linkedinUrl",
                        "githubUrl",
                        city,
                        "professionalSummary",
                        experiences,
                        "knownTechnologies",
                        "softSkills",
                        certifications,
                        languages,
                        "resumeFileName",
                        "resumeSyncStatus",
                        "resumeUploadedAt",
                        "createdAt",
                        "updatedAt"
                    from "UserProfile"
                    where "userId" = $1
                    limit 1
                    `,
                    [user.id],
                ),
                fetchMany(
                    `
                    select
                        id,
                        "taskId",
                        "completedAt",
                        "createdAt",
                        "updatedAt"
                    from "UserJornadaTaskProgress"
                    where "userId" = $1
                    order by "createdAt" asc
                    `,
                    [user.id],
                ),
                fetchMany(
                    `
                    select
                        id,
                        "tutorialKey",
                        "tutorialVersion",
                        status,
                        "currentStep",
                        "startedAt",
                        "completedAt",
                        "skippedAt",
                        "createdAt",
                        "updatedAt"
                    from "UserOnboardingProgress"
                    where "userId" = $1
                    order by "createdAt" asc
                    `,
                    [user.id],
                ),
                fetchMany(
                    `
                    select
                        id,
                        category,
                        status,
                        title,
                        description,
                        "expectedBehavior",
                        "pagePath",
                        impact,
                        "contactEmail",
                        "createdAt",
                        "updatedAt"
                    from "ProductFeedback"
                    where "userId" = $1
                    order by "createdAt" asc
                    `,
                    [user.id],
                ),
            ]);

        const projects = profile
            ? await fetchMany(
                `
                  select
                      id,
                      title,
                      "shortDescription",
                      technologies,
                      "deployUrl",
                      "createdAt",
                      "updatedAt"
                  from "UserProject"
                  where "userProfileId" = $1
                  order by "createdAt" asc
                  `,
                [profile.id],
            )
            : [];

        const payload = {
            meta: {
                generatedAt: new Date().toISOString(),
                source: "remote",
                seedUserEmail,
            },
            user,
            accounts,
            profile,
            projects,
            jornadaTaskProgress,
            onboardingProgress,
            productFeedbacks,
        };

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

        console.log(`Seed exportado em: ${outputPath}`);
        console.log(`Usuário: ${user.email}`);
        console.log(`Accounts: ${accounts.length}`);
        console.log(`Projects: ${projects.length}`);
        console.log(`Jornada progress: ${jornadaTaskProgress.length}`);
        console.log(`Onboarding progress: ${onboardingProgress.length}`);
        console.log(`Product feedbacks: ${productFeedbacks.length}`);
    } finally {
        await client.end();
    }
};

try {
    await main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
