import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { seed } from "./seed.ts";

// The slice of PGlite the app uses. Real Postgres, embedded: no Docker, no server to run.
export interface Db {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
}

export interface OpenOptions {
  dataDir?: string; // omit for an in-memory database that starts fresh every run
  seed?: boolean; // load the synthetic demo data into an empty database (default true)
}

export async function openDb(options: OpenOptions = {}): Promise<PGlite> {
  const db = new PGlite(options.dataDir);
  await db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  if (options.seed !== false) {
    const { rows } = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM invoices");
    if (rows[0].n === 0) await seed(db);
  }
  return db;
}

// Today's date in India, YYYY-MM-DD. Statements and reports run on IST days.
export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}
