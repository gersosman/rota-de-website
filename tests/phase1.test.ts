import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { classifyAssessment } from "../src/lib/domain/classify.ts";
import { verifyHmacSha256 } from "../src/lib/security/hmac.ts";
import { sameOrigin } from "../src/lib/security/origin.ts";
import { hashPassword, passwordIsStrong, verifyPassword } from "../src/lib/security/password.ts";
import { generateTotpSecret, totpCode, verifyTotp } from "../src/lib/security/totp.ts";
import { assessmentSchema, companyReady, emptyCompany } from "../src/lib/validation/assessment.ts";

const facts = {
  residenceCountry: "TR",
  ageRange: "25_34",
  licenceClasses: ["CE"],
  licenceCountry: "TR",
  hasCe: "yes" as const,
  euEeaLicence: "yes" as const,
  code95: "yes" as const,
  experienceRange: "y3_5",
  germanLevel: "B1",
  intent: "work_in_germany",
};

test("abs. 1 and abs. 2 stay on different review tracks", () => {
  const abs1 = classifyAssessment(facts);
  const abs2 = classifyAssessment({ ...facts, euEeaLicence: "no", code95: "no" });
  assert.equal(abs1.hint, "BESCHV_24A_ABS1_RELATED");
  assert.equal(abs1.leadStatus, "PRE_QUALIFICATION");
  assert.equal(abs2.hint, "BESCHV_24A_ABS2_RELATED");
  assert.equal(abs2.leadStatus, "PRE_QUALIFICATION");
  assert.match(abs1.reason, /kararı verilmedi/i);
  assert.match(abs2.reason, /kararı verilmedi/i);
});

test("age, language and intent do not change the scenario", () => {
  const older = classifyAssessment({ ...facts, ageRange: "55_plus", germanLevel: "none", intent: "unsure" });
  assert.equal(older.hint, classifyAssessment(facts).hint);
});

test("unknown qualification is not forced onto abs. 2", () => {
  const result = classifyAssessment({ ...facts, code95: "unknown" });
  assert.equal(result.hint, "NEEDS_REVIEW");
  assert.equal(result.leadStatus, "NEEDS_REVIEW");
});

test("missing answers stay insufficient", () => {
  const result = classifyAssessment({ ...facts, residenceCountry: undefined, licenceClasses: [] });
  assert.equal(result.hint, "INSUFFICIENT_INFORMATION");
});

test("passwords round-trip and reject short secrets", () => {
  assert.equal(passwordIsStrong("kisa"), false);
  const hash = hashPassword("guclu-parola-12");
  assert.equal(verifyPassword("guclu-parola-12", hash), true);
  assert.equal(verifyPassword("yanlis-parola-12", hash), false);
});

test("totp accepts the current code only", () => {
  const secret = generateTotpSecret();
  assert.equal(verifyTotp(secret, totpCode(secret)), true);
  assert.equal(verifyTotp(secret, "000000"), false);
});

test("origin and webhook signature checks", () => {
  assert.equal(sameOrigin("https://rota.example", "rota.example"), true);
  assert.equal(sameOrigin("https://evil.example", "rota.example"), false);
  assert.equal(verifyHmacSha256("secret", "body", "not-the-signature"), false);
});

test("assessment schema requires consent and acknowledgement", () => {
  const parsed = assessmentSchema.safeParse({
    ...facts,
    residenceDetail: "",
    licenceCountryDetail: "",
    fullName: "Ada Yılmaz",
    email: "ada@example.com",
    contactPreference: "email",
    phone: "",
    telegramHandle: "",
    instagramHandle: "",
    consent: false,
    disclaimerAck: true,
    idempotencyKey: "idem-key-1",
  });
  assert.equal(parsed.success, false);
  assert.equal(companyReady(emptyCompany()), false);
});

test("database migration enforces rls and verified payments", async () => {
  const db = new PGlite();
  const sqlText = await readFile(new URL("../migrations/001_init.sql", import.meta.url), "utf8");
  await db.exec(sqlText);
  const security = await db.query<{ relrowsecurity: boolean }>(
    "select relrowsecurity from pg_class where relname = 'leads'",
  );
  assert.equal(security.rows[0]?.relrowsecurity, true);
  const version = await db.query<{ n: number }>("select count(*)::int as n from legislation_versions where is_active = true");
  assert.equal(Number(version.rows[0]?.n), 1);
  await assert.rejects(
    db.query(
      "insert into payments (provider, status, amount_cents, verified_via_webhook) values ('test', 'succeeded', 1000, false)",
    ),
  );
  const integrations = await db.query<{ status: string }>("select status from integration_accounts");
  assert.ok(integrations.rows.every((row) => row.status === "disconnected"));
});
