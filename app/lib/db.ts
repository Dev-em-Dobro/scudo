import { Pool, type QueryResultRow } from "pg";

declare global {

    var _neonPool: Pool | undefined;
}

const connectionString = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL não está definido no .env");
}

export const pool = globalThis._neonPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") {
    globalThis._neonPool = pool;
}

export async function sql<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
    const result = await pool.query<T>(text, params);
    return result.rows;
}
