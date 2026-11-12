import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const script = new URL("../scripts/migrate.mjs", import.meta.url).pathname;

function run(cwd: string, env: Record<string, string>) {
  return spawnSync(process.execPath, [script], {
    cwd,
    env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? tmpdir(), ...env },
    encoding: "utf8",
  });
}

test("a build with no database url fails before migrating", () => {
  const result = run(process.cwd(), {});
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no database url/);
  assert.match(result.stderr, /DATABASE_URL_UNPOOLED/);
  assert.equal(output.includes("nothing to do"), false);
  assert.equal(output.includes("postgres://"), false);
});

test("an unpooled url is accepted and missing SQL files fail before connecting", () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "rota-migrate-"));
  const result = run(cwd, { DATABASE_URL_UNPOOLED: "postgres://user:secret@example.invalid/app" });
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no SQL files/);
  assert.equal(output.includes("nothing to do"), false);
  assert.equal(output.includes("secret"), false);
  assert.equal(output.includes("example.invalid"), false);
  assert.equal(output.includes("postgres://"), false);
});
