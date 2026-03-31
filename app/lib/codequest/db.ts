import { Pool } from 'pg';

if (!process.env.CODEQUEST_DATABASE_URL) {
    throw new Error('CODEQUEST_DATABASE_URL is not set');
}

export const codeQuestPool = new Pool({
    connectionString: process.env.CODEQUEST_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
});
