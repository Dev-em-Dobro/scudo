// One-off: reseta a senha de um user no banco LOCAL usando o hash do better-auth.
// Uso: node scripts/reset-password-local.mjs <email> <newPassword>
import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';

const [email, password] = process.argv.slice(2);
if (!email || !password) {
    console.error('Uso: node scripts/reset-password-local.mjs <email> <senha>');
    process.exit(1);
}

const DATABASE_URL =
    process.env.DATABASE_URL ??
    'postgresql://carrer_quest@localhost:5433/carrer_quest_local';

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const userRes = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
if (userRes.rowCount === 0) {
    console.error(`User ${email} não encontrado em ${DATABASE_URL}`);
    process.exit(2);
}
const userId = userRes.rows[0].id;

const hash = await hashPassword(password);
const upd = await client.query(
    `UPDATE "Account" SET password = $1, "updatedAt" = NOW()
     WHERE "userId" = $2 AND "providerId" = 'credential'`,
    [hash, userId],
);
if (upd.rowCount === 0) {
    console.error(`Nenhuma Account credential pro user ${email}`);
    process.exit(3);
}

console.log(`OK — senha de ${email} redefinida (${upd.rowCount} account row updated).`);
await client.end();
