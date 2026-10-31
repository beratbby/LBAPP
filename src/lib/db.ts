import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { lbPool?: Pool };

function getPool(): Pool {
  if (!globalForDb.lbPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL ist nicht gesetzt.");
    globalForDb.lbPool = new Pool({
      connectionString,
      max: 5,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForDb.lbPool;
}

/** Entweder der Pool oder ein Client innerhalb einer Transaktion. */
export type Db = Pick<PoolClient, "query">;

export function db(): Db {
  return getPool();
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client: Db = getPool(),
): Promise<T[]> {
  const res = await client.query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client: Db = getPool(),
): Promise<T | null> {
  const rows = await query<T>(text, params, client);
  return rows[0] ?? null;
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
