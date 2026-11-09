/**
 * Database access layer.
 *
 * One portable SQL dialect for both engines:
 *   - PostgreSQL in production (DATABASE_URL=postgres://…), driver: pg
 *   - SQLite locally for development/preview (node:sqlite, zero native deps)
 *
 * Conventions that keep the schema portable:
 *   - ids are TEXT (uuid), timestamps are TEXT ISO-8601 UTC, booleans INTEGER 0/1
 *   - `?` placeholders are translated to `$1..$n` for PostgreSQL
 */
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

export type QueryParam = string | number | boolean | Date | null | undefined;
export type Row = Record<string, unknown>;

export const dialect: "postgres" | "sqlite" = env.databaseUrl?.startsWith("postgres")
  ? "postgres"
  : "sqlite";

if (process.env.NODE_ENV === "production" && dialect === "sqlite" && process.env.VERCEL) {
  throw new Error(
    "DATABASE_URL is required in production (Vercel has a read-only filesystem, so the local SQLite fallback cannot be used).",
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Kept on globalThis so dev-server hot reloads (and serverless module reuse)
// never leak a second connection pool.
const globalForDb = globalThis as typeof globalThis & {
  __playnixSqlite?: any;
  __playnixPool?: any;
  __playnixMigrate?: Promise<void> | null;
};

let sqlite: any = globalForDb.__playnixSqlite ?? null;
let pool: any = globalForDb.__playnixPool ?? null;
let migratePromise: Promise<void> | null = globalForDb.__playnixMigrate ?? null;

function normalise(params: QueryParam[]): unknown[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString();
    return p;
  });
}

/** Translate `?` placeholders into PostgreSQL `$n` while respecting string literals. */
function toPgPlaceholders(sql: string): string {
  let out = "";
  let index = 0;
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          out += sql[i + 1];
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "?") {
      index += 1;
      out += `$${index}`;
      continue;
    }
    out += ch;
  }
  return out;
}

async function initSqlite() {
  if (sqlite) return sqlite;
  const file = path.resolve(process.cwd(), env.sqlitePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const { DatabaseSync } = await import("node:sqlite");
  sqlite = new DatabaseSync(file);
  globalForDb.__playnixSqlite = sqlite;
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec("PRAGMA busy_timeout = 5000;");
  return sqlite;
}

async function initPostgres() {
  if (pool) return pool;
  const pg = await import("pg");
  const Pool = (pg as any).Pool ?? (pg as any).default?.Pool;
  // DATABASE_POOL_MAX lets constrained environments (serverless, a local
  // single-connection proxy) cap concurrency without touching code.
  const max = Math.max(1, Number(process.env.DATABASE_POOL_MAX ?? 5) || 5);
  pool = new Pool({
    connectionString: env.databaseUrl,
    max,
    idleTimeoutMillis: max === 1 ? 0 : 10_000,
    ssl: env.databaseUrl?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });
  globalForDb.__playnixPool = pool;
  return pool;
}

function schemaStatements(): string[] {
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.split("\n").every((line) => line.trim().startsWith("--")));
}

/**
 * Columns that were added after the initial schema. `CREATE TABLE IF NOT EXISTS`
 * is a no-op on an existing table, so a fresh column has to be added with an
 * ALTER. Running it twice is harmless: the "already exists" error is swallowed.
 */
const ADDED_COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: "games", column: "developer_id", definition: "TEXT" },
  { table: "games", column: "review_note", definition: "TEXT" },
  { table: "games", column: "submitted_at", definition: "TEXT" },
];

async function addMissingColumns(): Promise<void> {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const sql = `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`;
    try {
      if (dialect === "sqlite") {
        const db = await initSqlite();
        db.exec(sql);
      } else {
        const p = await initPostgres();
        await p.query(sql);
      }
    } catch {
      // Column already exists — the normal case on every boot after the first.
    }
  }
}

async function migrate(): Promise<void> {
  const statements = schemaStatements();
  if (dialect === "sqlite") {
    const db = await initSqlite();
    for (const statement of statements) db.exec(statement);
  } else {
    const p = await initPostgres();
    for (const statement of statements) await p.query(statement);
  }
  await addMissingColumns();
}

/** Idempotent migration guard (schema uses IF NOT EXISTS). */
export async function ensureSchema(): Promise<void> {
  if (!migratePromise) {
    migratePromise = migrate();
    globalForDb.__playnixMigrate = migratePromise;
  }
  return migratePromise;
}

export async function all<T = Row>(sql: string, params: QueryParam[] = []): Promise<T[]> {
  await ensureSchema();
  const values = normalise(params);
  if (dialect === "sqlite") {
    const db = await initSqlite();
    // node:sqlite returns null-prototype rows; React refuses to serialise those
    // across the server/client boundary, so normalise to plain objects.
    return (db.prepare(sql).all(...values) as Record<string, unknown>[]).map((row) => ({ ...row })) as T[];
  }
  const p = await initPostgres();
  const result = await p.query(toPgPlaceholders(sql), values);
  return result.rows as T[];
}

export async function one<T = Row>(sql: string, params: QueryParam[] = []): Promise<T | null> {
  const rows = await all<T>(sql, params);
  return rows[0] ?? null;
}

export async function run(sql: string, params: QueryParam[] = []): Promise<number> {
  await ensureSchema();
  const values = normalise(params);
  if (dialect === "sqlite") {
    const db = await initSqlite();
    const result = db.prepare(sql).run(...values);
    return Number(result.changes ?? 0);
  }
  const p = await initPostgres();
  const result = await p.query(toPgPlaceholders(sql), values);
  return result.rowCount ?? 0;
}

/** Run several statements atomically. */
export async function transaction<T>(fn: (tx: {
  all: typeof all;
  one: typeof one;
  run: typeof run;
}) => Promise<T>): Promise<T> {
  await ensureSchema();
  if (dialect === "sqlite") {
    const db = await initSqlite();
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = await fn({ all, one, run });
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  const p = await initPostgres();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const scoped = {
      all: async <R = Row>(sql: string, params: QueryParam[] = []) =>
        (await client.query(toPgPlaceholders(sql), normalise(params))).rows as R[],
      one: async <R = Row>(sql: string, params: QueryParam[] = []) => {
        const rows = (await client.query(toPgPlaceholders(sql), normalise(params))).rows as R[];
        return rows[0] ?? null;
      },
      run: async (sql: string, params: QueryParam[] = []) =>
        (await client.query(toPgPlaceholders(sql), normalise(params))).rowCount ?? 0,
    };
    const result = await fn(scoped);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** COUNT(*) comes back as a string from PostgreSQL int8 — normalise it. */
export function count(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function healthCheck(): Promise<{ ok: boolean; dialect: string; error?: string }> {
  try {
    await one("SELECT 1 AS ok");
    return { ok: true, dialect };
  } catch (error) {
    return { ok: false, dialect, error: error instanceof Error ? error.message : "unknown error" };
  }
}
