import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const PRESENCE = ["DATABASE_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"];
const MIGRATION = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"];

function firstSet(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

function redact(error) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const message = (error instanceof Error ? error.message : "migration failed")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]")
    .replace(/(password|pwd)=([^\s&]+)/gi, "$1=[redacted]")
    .slice(0, 240);
  return { code, message };
}

function fail(message) {
  console.error(`migrate: failed: ${message}`);
  process.exit(1);
}

const selected = firstSet(MIGRATION);
const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort();

if (!selected || !firstSet(PRESENCE)) {
  fail(`no database url. Set ${PRESENCE.join(" or ")}.`);
}
if (files.length === 0) {
  fail("no SQL files in migrations.");
}

console.log(`migrate: using ${selected.name}`);
const client = new pg.Client({ connectionString: selected.value });

try {
  await client.connect();
  try {
    await client.query("set lock_timeout = '60s'");
    await client.query("select pg_advisory_lock(7272741)");
    await client.query(
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const done = new Set((await client.query("select name from schema_migrations")).rows.map((row) => row.name));
    const pending = files.filter((name) => !done.has(name));
    for (const file of pending) {
      await client.query("begin");
      try {
        await client.query(await readFile(`migrations/${file}`, "utf8"));
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
        console.log(`migrate: applied ${file}`);
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      }
    }
    console.log(pending.length === 0 ? "migrate: schema up to date" : "migrate: complete");
  } finally {
    await client.end();
  }
} catch (error) {
  const safe = redact(error);
  fail(`${safe.code ? `${safe.code}: ` : ""}${safe.message}`);
}
