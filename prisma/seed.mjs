import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
    OnboardingStatus,
    PrismaClient,
    ProductFeedbackCategory,
    ProductFeedbackStatus,
    ResumeSyncStatus,
} from "@prisma/client";

const DEFAULT_SEED_PATH = "prisma/seed-data/user-seed.json";

const inputPath = path.resolve(
    process.cwd(),
    process.env.SEED_INPUT_PATH ?? DEFAULT_SEED_PATH,
);

if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de seed não encontrado em ${inputPath}`);
}

const seedContent = fs.readFileSync(inputPath, "utf8");
const payload = JSON.parse(seedContent);

const prisma = new PrismaClient();

const resumeSyncStatusValues = new Set(Object.values(ResumeSyncStatus));
const onboardingStatusValues = new Set(Object.values(OnboardingStatus));
const feedbackCategoryValues = new Set(Object.values(ProductFeedbackCategory));
const feedbackStatusValues = new Set(Object.values(ProductFeedbackStatus));

const toNullableDate = (value) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const toDateOrNow = (value) => toNullableDate(value) ?? new Date();

const normalizeNullableString = (value) => {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const normalizeStringList = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
};

const asEnum = (value, allowedValues, fallbackValue) =>
    allowedValues.has(value) ? value : fallbackValue;

const asIntegerOrNull = (value) => (Number.isInteger(value) ? value : null);

const asPositiveIntegerOrDefault = (value, fallbackValue = 0) =>
    Number.isInteger(value) && value >= 0 ? value : fallbackValue;

const uniqueById = (rows) => {
    if (!Array.isArray(rows)) {
        return [];
    }

    const seen = new Set();
    const result = [];

    for (const row of rows) {
        if (!row || typeof row !== "object") {
            continue;
        }

        const id = typeof row.id === "string" ? row.id : null;

        if (!id || seen.has(id)) {
            continue;
        }

        seen.add(id);
        result.push(row);
    }

    return result;
};

const user = payload?.user;
const accounts = uniqueById(payload?.accounts);
const profile = payload?.profile && typeof payload.profile === "object" ? payload.profile : null;
const projects = uniqueById(payload?.projects);
const jornadaTaskProgress = uniqueById(payload?.jornadaTaskProgress);
const onboardingProgress = uniqueById(payload?.onboardingProgress);
const productFeedbacks = uniqueById(payload?.productFeedbacks);

if (!user || typeof user !== "object") {
    throw new Error("Seed inválido: bloco user ausente.");
}

if (typeof user.id !== "string" || user.id.trim().length === 0) {
    throw new Error("Seed inválido: user.id ausente.");
}

if (typeof user.email !== "string" || user.email.trim().length === 0) {
    throw new Error("Seed inválido: user.email ausente.");
}

const normalizedEmail = user.email.trim().toLowerCase();

const userCreateData = {
    id: user.id,
    name: normalizeNullableString(user.name) ?? "Usuário local",
    email: normalizedEmail,
    emailVerified: Boolean(user.emailVerified),
    officialStudentVerifiedAt: toNullableDate(user.officialStudentVerifiedAt),
    curseducaMemberId: asIntegerOrNull(user.curseducaMemberId),
    curseducaMemberSlug: normalizeNullableString(user.curseducaMemberSlug),
    curseducaMemberUuid: normalizeNullableString(user.curseducaMemberUuid),
    curseducaSyncNeedsRetry: Boolean(user.curseducaSyncNeedsRetry),
    image: normalizeNullableString(user.image),
    createdAt: toDateOrNow(user.createdAt),
    updatedAt: toDateOrNow(user.updatedAt),
};

if (accounts.length > 0) {
    userCreateData.accounts = {
        create: accounts
            .filter((account) =>
                typeof account.accountId === "string" &&
                account.accountId.trim().length > 0 &&
                typeof account.providerId === "string" &&
                account.providerId.trim().length > 0,
            )
            .map((account) => ({
                id: account.id,
                accountId: account.accountId.trim(),
                providerId: account.providerId.trim(),
                password: normalizeNullableString(account.password),
                createdAt: toDateOrNow(account.createdAt),
                updatedAt: toDateOrNow(account.updatedAt),
            })),
    };
}

if (profile) {
    const profileCreateData = {
        id: profile.id,
        fullName: normalizeNullableString(profile.fullName),
        linkedinUrl: normalizeNullableString(profile.linkedinUrl),
        githubUrl: normalizeNullableString(profile.githubUrl),
        city: normalizeNullableString(profile.city),
        professionalSummary: normalizeNullableString(profile.professionalSummary),
        experiences: normalizeStringList(profile.experiences),
        knownTechnologies: normalizeStringList(profile.knownTechnologies),
        softSkills: normalizeStringList(profile.softSkills),
        certifications: normalizeStringList(profile.certifications),
        languages: normalizeStringList(profile.languages),
        resumeFileName: normalizeNullableString(profile.resumeFileName),
        resumeSyncStatus: asEnum(
            profile.resumeSyncStatus,
            resumeSyncStatusValues,
            ResumeSyncStatus.NOT_UPLOADED,
        ),
        resumeUploadedAt: toNullableDate(profile.resumeUploadedAt),
        createdAt: toDateOrNow(profile.createdAt),
        updatedAt: toDateOrNow(profile.updatedAt),
    };

    const relatedProjects = projects
        .filter((project) => typeof project.title === "string" && project.title.trim().length > 0)
        .map((project) => ({
            id: project.id,
            title: project.title.trim(),
            shortDescription: normalizeNullableString(project.shortDescription),
            technologies: normalizeStringList(project.technologies),
            deployUrl: normalizeNullableString(project.deployUrl),
            createdAt: toDateOrNow(project.createdAt),
            updatedAt: toDateOrNow(project.updatedAt),
        }));

    if (relatedProjects.length > 0) {
        profileCreateData.projects = {
            create: relatedProjects,
        };
    }

    userCreateData.profile = {
        create: profileCreateData,
    };
}

if (jornadaTaskProgress.length > 0) {
    userCreateData.jornadaTaskProgress = {
        create: jornadaTaskProgress
            .filter((task) => typeof task.taskId === "string" && task.taskId.trim().length > 0)
            .map((task) => ({
                id: task.id,
                taskId: task.taskId.trim(),
                completedAt: toDateOrNow(task.completedAt),
                createdAt: toDateOrNow(task.createdAt),
                updatedAt: toDateOrNow(task.updatedAt),
            })),
    };
}

if (onboardingProgress.length > 0) {
    userCreateData.onboardingProgress = {
        create: onboardingProgress
            .filter(
                (item) =>
                    typeof item.tutorialKey === "string" &&
                    item.tutorialKey.trim().length > 0 &&
                    Number.isInteger(item.tutorialVersion),
            )
            .map((item) => ({
                id: item.id,
                tutorialKey: item.tutorialKey.trim(),
                tutorialVersion: item.tutorialVersion,
                status: asEnum(
                    item.status,
                    onboardingStatusValues,
                    OnboardingStatus.NOT_STARTED,
                ),
                currentStep: asPositiveIntegerOrDefault(item.currentStep),
                startedAt: toNullableDate(item.startedAt),
                completedAt: toNullableDate(item.completedAt),
                skippedAt: toNullableDate(item.skippedAt),
                createdAt: toDateOrNow(item.createdAt),
                updatedAt: toDateOrNow(item.updatedAt),
            })),
    };
}

if (productFeedbacks.length > 0) {
    userCreateData.productFeedbacks = {
        create: productFeedbacks
            .filter(
                (item) =>
                    typeof item.title === "string" &&
                    item.title.trim().length > 0 &&
                    typeof item.description === "string" &&
                    item.description.trim().length > 0 &&
                    typeof item.contactEmail === "string" &&
                    item.contactEmail.trim().length > 0,
            )
            .map((item) => ({
                id: item.id,
                category: asEnum(
                    item.category,
                    feedbackCategoryValues,
                    ProductFeedbackCategory.OTHER,
                ),
                status: asEnum(
                    item.status,
                    feedbackStatusValues,
                    ProductFeedbackStatus.RECEIVED,
                ),
                title: item.title.trim(),
                description: item.description.trim(),
                expectedBehavior: normalizeNullableString(item.expectedBehavior),
                pagePath: normalizeNullableString(item.pagePath),
                impact: normalizeNullableString(item.impact),
                contactEmail: item.contactEmail.trim().toLowerCase(),
                createdAt: toDateOrNow(item.createdAt),
                updatedAt: toDateOrNow(item.updatedAt),
            })),
    };
}

const main = async () => {
    await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({
            where: {
                OR: [{ id: user.id }, { email: normalizedEmail }],
            },
        });

        await tx.user.create({ data: userCreateData });
    });

    console.log(`Seed aplicado com sucesso em ${inputPath}`);
    console.log(`Usuário: ${normalizedEmail}`);
};

try {
    await main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
} finally {
    await prisma.$disconnect();
}
