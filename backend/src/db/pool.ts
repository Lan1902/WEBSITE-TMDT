import { Pool, PoolClient } from "pg";
import { env } from "../config/env";

// Supabase yêu cầu SSL
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 10,
});

export const query = <T = any>(text: string, params?: unknown[]) =>
  pool.query(text, params).then((r) => r.rows as T[]);

// Chạy nhiều câu lệnh trong một transaction; lỗi thì ROLLBACK
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
