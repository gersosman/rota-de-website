import "server-only";

import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import pg from "pg";
import { DatabaseNotConfiguredError, dbFailureKind, resolveDatabaseUrl, safeDbError } from "@/server/database-url";

type LocalDb = {
  exec: (query: string) => Promise<unknown>;
  query: <T>(query: string, params?: unknown[]) => Promise<{ rows: T[] }>;
};

const databaseUrl = resolveDatabaseUrl();

function serverlessRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

let loggedMissingDatabase = false;

function requireConfiguredDatabase(): never {
  if (!loggedMissingDatabase) {
    loggedMissingDatabase = true;
    console.error("database_not_configured", {
      required: ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"],
    });
  }
  throw new DatabaseNotConfiguredError();
}
let pool: pg.Pool | undefined;
let local: Promise<LocalDb> | undefined;
let localChain: Promise<unknown> = Promise.resolve();

export type QueryFn = <T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<T[]>;

export function dataStoreMode(): "postgres" | "pglite" {
  return databaseUrl !== "" ? "postgres" : "pglite";
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = localChain.then(task, task);
  localChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

let appliedNames: Set<string> | null = null;

export async function applyPendingMigrations(db: LocalDb) {
  const directory = path.join(process.cwd(), "migrations");
  const files = (await readdir(directory).catch(() => [])).filter((file) => file.endsWith(".sql")).sort();
  if (appliedNames && files.every((file) => appliedNames?.has(file))) return;
  await db.exec(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const applied = new Set(
    (await db.query<{ name: string }>("select name from schema_migrations")).rows.map((row) => row.name),
  );
  for (const file of files) {
    if (applied.has(file)) continue;
    const sqlText = await readFile(path.join(directory, file), "utf8");
    await db.exec("begin");
    try {
      await db.exec(sqlText);
      await db.query("insert into schema_migrations (name) values ($1)", [file]);
      await db.exec("commit");
      applied.add(file);
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
  }
  appliedNames = applied;
}

async function startLocal(): Promise<LocalDb> {
  if (serverlessRuntime()) requireConfiguredDatabase();
  const { PGlite } = await import("@electric-sql/pglite");
  const persist = process.env.NEXT_PHASE !== "phase-production-build";
  const directory = path.join(process.cwd(), "data", "pglite");
  if (persist) await mkdir(directory, { recursive: true });
  const db = new PGlite(persist ? directory : undefined);
  await applyPendingMigrations(db);
  return db;
}

function getLocal(): Promise<LocalDb> {
  local ??= startLocal().catch((error: unknown) => {
    local = undefined;
    throw error;
  });
  return local;
}

function postgresSsl(connectionString: string): pg.ConnectionConfig["ssl"] {
  const mode = /(?:\?|&)sslmode=([^&]+)/i.exec(connectionString)?.[1]?.toLowerCase();
  if (mode === "disable") return undefined;
  if (mode === "verify-full" || mode === "verify-ca") return { rejectUnauthorized: true };
  if (mode) return { rejectUnauthorized: false };
  let host = "";
  try {
    host = new URL(connectionString).hostname;
  } catch {
    host = "";
  }
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "::1") return undefined;
  if (process.env.NODE_ENV === "production") return { rejectUnauthorized: false };
  return undefined;
}

function getPool(): pg.Pool {
  pool ??= new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    ssl: postgresSsl(databaseUrl),
  });
  return pool;
}

let postgresReady: Promise<void> | undefined;

async function ensurePostgresSchema() {
  if (postgresReady) return postgresReady;
  postgresReady = migratePostgres().then(
    () => undefined,
    (error: unknown) => {
      console.error("schema_check_failed", safeDbError(error));
      if (dbFailureKind(error) !== "query") {
        postgresReady = undefined;
        throw error;
      }
    },
  );
  return postgresReady;
}

async function migratePostgres() {
  const client = await getPool().connect();
  let locked = false;
  try {
    try {
      await client.query("select pg_advisory_lock(7272741)");
      locked = true;
    } catch {
      // Some hosted poolers reject session locks. The statements below are idempotent.
    }
    await client.query(
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const directory = path.join(process.cwd(), "migrations");
    const files = (await readdir(directory).catch(() => [])).filter((file) => file.endsWith(".sql")).sort();
    const done = new Set(
      (await client.query<{ name: string }>("select name from schema_migrations")).rows.map((row) => row.name),
    );
    for (const file of files) {
      if (done.has(file)) continue;
      const sqlText = await readFile(path.join(directory, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sqlText);
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    if (locked) await client.query("select pg_advisory_unlock(7272741)").catch(() => undefined);
    client.release();
  }
}

async function bindToRequest() {
  try {
    await connection();
  } catch (error) {
    const digest = error && typeof error === "object" && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";
    const message = error instanceof Error ? error.message : "";
    if (
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest === "NEXT_PRERENDER_INTERRUPTED" ||
      message.includes("outside a request scope") ||
      message.includes("couldn't be rendered statically")
    ) {
      return;
    }
    throw error;
  }
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  await bindToRequest();
  if (databaseUrl !== "") {
    await ensurePostgresSchema();
    const result = await getPool().query(text, params);
    return result.rows as T[];
  }
  if (serverlessRuntime()) requireConfiguredDatabase();
  return enqueue(async () => {
    const db = await getLocal();
    await applyPendingMigrations(db);
    const result = await db.query<T>(text, params);
    return result.rows;
  });
}

export async function readOptional<T>(scope: string, text: string, params: unknown[] = []): Promise<T[] | null> {
  try {
    return await sql<T>(text, params);
  } catch (error) {
    const kind = dbFailureKind(error);
    if (kind === "query") throw error;
    console.error(scope, { kind, ...safeDbError(error) });
    return null;
  }
}

export async function withTransaction<T>(fn: (query: QueryFn) => Promise<T>): Promise<T> {
  await bindToRequest();
  if (serverlessRuntime() && databaseUrl === "") requireConfiguredDatabase();
  if (databaseUrl !== "") {
    await ensurePostgresSchema();
    const client = await getPool().connect();
    const query: QueryFn = async <T,>(text: string, params: unknown[] = []) => {
      const result = await client.query(text, params);
      return result.rows as T[];
    };
    try {
      await client.query("begin");
      const value = await fn(query);
      await client.query("commit");
      return value;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  return enqueue(async () => {
    const db = await getLocal();
    await applyPendingMigrations(db);
    const query: QueryFn = async <T,>(text: string, params: unknown[] = []) => {
      const result = await db.query(text, params);
      return result.rows as T[];
    };
    await db.exec("begin");
    try {
      const value = await fn(query);
      await db.exec("commit");
      return value;
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
  });
}
