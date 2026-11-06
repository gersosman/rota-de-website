import "server-only";

import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { connection } from "next/server";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
let pool: pg.Pool | undefined;
let local: Promise<PGlite> | undefined;
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

async function startLocal(): Promise<PGlite> {
  const persist = process.env.NEXT_PHASE !== "phase-production-build";
  const directory = path.join(process.cwd(), "data", "pglite");
  if (persist) await mkdir(directory, { recursive: true });
  const db = new PGlite(persist ? directory : undefined);
  await db.exec(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const files = (await readdir(path.join(process.cwd(), "migrations")).catch(() => [])).filter((file) =>
    file.endsWith(".sql"),
  ).sort();
  const applied = new Set(
    (await db.query<{ name: string }>("select name from schema_migrations")).rows.map((row) => row.name),
  );
  for (const file of files) {
    if (applied.has(file)) continue;
    const sqlText = await readFile(path.join(process.cwd(), "migrations", file), "utf8");
    await db.exec("begin");
    try {
      await db.exec(sqlText);
      await db.query("insert into schema_migrations (name) values ($1)", [file]);
      await db.exec("commit");
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
  }
  return db;
}

function getLocal(): Promise<PGlite> {
  local ??= startLocal().catch((error: unknown) => {
    local = undefined;
    throw error;
  });
  return local;
}

function getPool(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
  return pool;
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  await connection();
  if (databaseUrl !== "") {
    const result = await getPool().query(text, params);
    return result.rows as T[];
  }
  return enqueue(async () => {
    const db = await getLocal();
    const result = await db.query<T>(text, params);
    return result.rows;
  });
}

export async function withTransaction<T>(fn: (query: QueryFn) => Promise<T>): Promise<T> {
  await connection();
  if (databaseUrl !== "") {
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
