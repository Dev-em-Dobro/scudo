/**
 * Backfill do currículo ATS gerado para usuários com ranks concluídos.
 *
 * Uso local:
 *   DATABASE_URL=$LOCAL_DATABASE_URL node scripts/jornada/backfill-generated-resume.mjs
 */
import 'dotenv/config';
import process from 'node:process';
import pg from 'pg';

import { buildAtsResumeDocument } from '../../app/lib/resume/buildDocument.ts';
import { getUnlockedCourseProjects } from '../../app/lib/resume/courseProjects.ts';
import { generateAtsResumePdf } from '../../app/lib/resume/generatePdf.ts';

const databaseUrl = (process.env.DATABASE_URL ?? process.env.LOCAL_DATABASE_URL ?? '').trim();

if (!databaseUrl) {
    console.error('Defina DATABASE_URL ou LOCAL_DATABASE_URL.');
    process.exit(1);
}

const STAGE_RANK = {
    s1: 'Ferro',
    s2: 'Bronze',
    s3: 'Prata',
    s4: 'Ouro',
    s5: 'Platina',
    s6: 'Esmeralda',
    s7: 'Diamante',
    s8: 'Mythril',
    s9: 'Mestre',
    s10: 'Lendário',
};

const client = new pg.Client({ connectionString: databaseUrl });

async function main() {
    await client.connect();

    const users = await client.query(`
        select distinct u."id", u."email", u."name"
        from "User" u
        inner join "UserJornadaStageCompletion" c on c."userId" = u."id"
        order by u."email"
    `);

    let updated = 0;
    let skipped = 0;

    for (const user of users.rows) {
        const stages = await client.query(
            `select "stageId" from "UserJornadaStageCompletion" where "userId" = $1`,
            [user.id],
        );
        const completedStageIds = new Set(stages.rows.map((row) => row.stageId));
        const unlocked = getUnlockedCourseProjects(completedStageIds);

        if (unlocked.length === 0) {
            skipped += 1;
            continue;
        }

        const profileResult = await client.query(
            `select * from "UserProfile" where "userId" = $1`,
            [user.id],
        );

        let profile = profileResult.rows[0];
        if (!profile) {
            await client.query(
                `
                insert into "UserProfile" ("id", "userId", "fullName", "updatedAt")
                values ($1, $2, $3, now())
                `,
                [crypto.randomUUID(), user.id, user.name ?? user.email],
            );
            const refetch = await client.query(`select * from "UserProfile" where "userId" = $1`, [user.id]);
            profile = refetch.rows[0];
        }

        for (const courseProject of unlocked) {
            await client.query(
                `
                insert into "UserProject" (
                  "id", "userProfileId", "title", "shortDescription", "technologies", "deployUrl", "courseProjectKey", "updatedAt"
                ) values ($1, $2, $3, $4, $5, $6, $7, now())
                on conflict ("userProfileId", "courseProjectKey") do update set
                  "title" = excluded."title",
                  "shortDescription" = excluded."shortDescription",
                  "technologies" = excluded."technologies",
                  "deployUrl" = excluded."deployUrl",
                  "updatedAt" = now()
                `,
                [
                    crypto.randomUUID(),
                    profile.id,
                    courseProject.title,
                    courseProject.description,
                    courseProject.technologies,
                    courseProject.deployUrl ?? null,
                    courseProject.key,
                ],
            );
        }

        const projectsResult = await client.query(
            `select * from "UserProject" where "userProfileId" = $1 order by "createdAt" asc`,
            [profile.id],
        );

        const stageOrder = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];
        const latestStageId = stageOrder.filter((id) => completedStageIds.has(id)).at(-1) ?? null;
        const rankName = latestStageId ? STAGE_RANK[latestStageId] ?? null : null;

        const document = buildAtsResumeDocument({
            profile: {
                ...profile,
                projects: projectsResult.rows,
            },
            userEmail: user.email,
            userName: user.name,
            completedStageIds,
            rankName,
        });

        const pdfBytes = await generateAtsResumePdf(document);
        const knownTechnologies = [
            ...new Set([
                ...(profile.knownTechnologies ?? []),
                ...unlocked.flatMap((project) => project.technologies),
            ]),
        ];

        await client.query(
            `
            update "UserProfile"
            set
              "knownTechnologies" = $2,
              "generatedResumeJson" = $3,
              "generatedResumePdf" = $4,
              "generatedResumeUpdatedAt" = now(),
              "generatedResumeStageId" = $5,
              "updatedAt" = now()
            where "id" = $1
            `,
            [profile.id, knownTechnologies, JSON.stringify(document), Buffer.from(pdfBytes), latestStageId],
        );

        updated += 1;
        console.log(`✓ ${user.email} — ${document.projects.length} projeto(s), rank ${rankName ?? 'N/A'}`);
    }

    console.log(JSON.stringify({ usersWithCompletions: users.rows.length, updated, skipped }, null, 2));
    await client.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
