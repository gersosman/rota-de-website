import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mayClearRecoveryCookie, mfaScreen, recoveryCodesFromCookie } from "../src/lib/recovery-screen.ts";

test("a recovery cookie shows codes and an empty cookie stays on the challenge", () => {
  assert.equal(mfaScreen(null), "challenge");
  assert.equal(mfaScreen(""), "challenge");
  assert.equal(mfaScreen(" , "), "challenge");
  assert.deepEqual(recoveryCodesFromCookie("ABCD1234,EFGH5678"), ["ABCD1234", "EFGH5678"]);
  assert.equal(mfaScreen("ABCD1234,EFGH5678"), "recovery");
});

test("the recovery cookie is cleared only after confirmation and a passed MFA check", () => {
  assert.equal(mayClearRecoveryCookie({ confirmed: false, mfaEnabled: true, mfaPassed: true }), false);
  assert.equal(mayClearRecoveryCookie({ confirmed: true, mfaEnabled: false, mfaPassed: true }), false);
  assert.equal(mayClearRecoveryCookie({ confirmed: true, mfaEnabled: true, mfaPassed: false }), false);
  assert.equal(mayClearRecoveryCookie({ confirmed: true, mfaEnabled: true, mfaPassed: true }), true);
});

test("the MFA page reads the recovery cookie and does not change it", async () => {
  const page = await readFile(new URL("../src/app/admin/mfa/page.tsx", import.meta.url), "utf8");
  const form = await readFile(new URL("../src/components/admin/mfa-form.tsx", import.meta.url), "utf8");
  const recoveryReturn = page.indexOf('mfaScreen(saved) === "recovery"');
  const panelGate = page.indexOf("requireMfaStage()");
  assert.ok(recoveryReturn > 0 && panelGate > recoveryReturn);
  assert.equal(page.includes(".delete("), false);
  assert.equal(page.includes(".set("), false);
  assert.match(page, /cookies\(\)\)\.get\(RECOVERY_COOKIE\)/);
  assert.match(form, /acknowledgeRecoveryAction/);
  assert.match(form, /name="saved"/);
  assert.equal(form.includes("console."), false);
});

test("acknowledgement deletes the cookie in a server action and MFA verification stays in place", async () => {
  const actions = await readFile(new URL("../src/server/actions/auth.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/admin/oturum/route.ts", import.meta.url), "utf8");
  const auth = await readFile(new URL("../src/server/auth.ts", import.meta.url), "utf8");
  const acknowledge = actions.slice(actions.indexOf("export async function acknowledgeRecoveryAction"), actions.indexOf("export async function confirmMfaAction"));
  const enroll = route.slice(route.indexOf("async function mfa"));
  const confirm = auth.slice(auth.indexOf("export async function confirmMfa"), auth.indexOf("export async function verifyMfa"));
  const clearAt = acknowledge.indexOf("mayClearRecoveryCookie");
  const deleteAt = acknowledge.indexOf("jar.delete(");
  const panelAt = acknowledge.indexOf('redirect("/admin")');
  assert.ok(clearAt > 0 && deleteAt > clearAt && panelAt > deleteAt);
  assert.equal(acknowledge.includes("console."), false);
  assert.match(enroll, /jar\.set\(RECOVERY_COOKIE/);
  assert.match(enroll, /\/admin\/mfa\?hazir=1/);
  assert.equal(enroll.includes(".delete("), false);
  assert.match(confirm, /verifyTotp\(secret, code\)/);
  assert.match(confirm, /mfa_enabled = true/);
});
