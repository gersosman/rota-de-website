import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseNotConfiguredError, dbFailureKind, resolveDatabaseUrl, resolveMigrationUrl, safeDbError } from "../src/server/database-url.ts";

test("postgres url resolution prefers the app variable and never needs a guessed value", () => {
  assert.equal(resolveDatabaseUrl({}), "");
  assert.equal(resolveDatabaseUrl({ POSTGRES_URL: "postgres://postgres-host/app" }), "postgres://postgres-host/app");
  assert.equal(
    resolveDatabaseUrl({ DATABASE_URL: "postgres://primary/app", POSTGRES_URL: "postgres://other/app" }),
    "postgres://primary/app",
  );
  assert.equal(
    resolveMigrationUrl({ DATABASE_URL: "postgres://pooled/app", POSTGRES_URL_NON_POOLING: "postgres://direct/app" }),
    "postgres://direct/app",
  );
});

test("infrastructure database failures stay distinct from a query error", () => {
  assert.equal(dbFailureKind(new DatabaseNotConfiguredError()), "not_configured");
  assert.equal(dbFailureKind(Object.assign(new Error("mkdir failed"), { code: "EROFS" })), "unreachable");
  assert.equal(dbFailureKind(Object.assign(new Error("relation missing"), { code: "42P01" })), "query");
  assert.equal(dbFailureKind(new Error("During prerendering, `connection()` rejects when the prerender is complete.")), "query");
  const safe = safeDbError(new Error("failed postgres://user:secret@db.example/app"));
  assert.equal(safe.message.includes("secret"), false);
  assert.equal(safe.message.includes("[redacted]"), true);
});
