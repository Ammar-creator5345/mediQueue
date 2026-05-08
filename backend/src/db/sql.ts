import { getPool } from "../config/db";

// `pg` supports rich param types (arrays, json, etc). Keep this permissive.
export type SqlParams = any[];

export async function sql<T = any>(text: string, params: SqlParams = []): Promise<T[]> {
  const pool = getPool();
  const res = await pool.query(text, params);
  return res.rows as T[]
}

export async function sqlOne<T = any>(text: string, params: SqlParams = []): Promise<T | null> {
  const rows = await sql<T>(text, params);
  return rows[0] ?? null;
}

