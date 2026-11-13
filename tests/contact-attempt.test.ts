import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createContactAttempt, createContactIdempotencyKey } from "../src/lib/contact-attempt.ts";
import { contactFollowUp } from "../src/lib/contact-mail.ts";

test("a contact attempt keeps one key and a fresh page creates another", () => {
  let n = 0;
  const ids = ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2"];
  const randomUUID = () => ids[n++] ?? "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";
  const first = createContactAttempt(randomUUID);
  assert.equal(first.prepare(), "contact-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
  assert.equal(first.prepare(), "contact-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
  const refreshed = createContactAttempt(randomUUID);
  assert.equal(refreshed.prepare(), "contact-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2");
  assert.notEqual(first.prepare(), refreshed.prepare());
});

test("browser keys are unique contact uuids", () => {
  const first = createContactIdempotencyKey();
  const second = createContactIdempotencyKey();
  assert.match(first, /^contact-[0-9a-f-]{36}$/);
  assert.notEqual(first, second);
});

test("the same contact key is a duplicate and does not queue mail", async () => {
  const db = await contactDb();
  const key = "contact-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
  const first = await saveContact(db, key, "birinci@example.com");
  const second = await saveContact(db, key, "ikinci@example.com");
  assert.equal(first.duplicate, false);
  assert.equal(contactFollowUp(first), "notify");
  assert.equal(second.duplicate, true);
  assert.equal(contactFollowUp(second), "duplicate");
  const messages = await db.query<{ email: string }>("select email from contact_messages order by email");
  assert.deepEqual(messages.rows.map((row) => row.email), ["birinci@example.com"]);
});

test("two contact keys create two messages and only new records queue mail", async () => {
  const db = await contactDb();
  const first = await saveContact(db, createContactIdempotencyKey(), "bir@example.com");
  const second = await saveContact(db, createContactIdempotencyKey(), "iki@example.com");
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, false);
  assert.equal(contactFollowUp(first), "notify");
  assert.equal(contactFollowUp({ duplicate: true, publicCode: first.publicCode }), "duplicate");
  const messages = await db.query<{ email: string }>("select email from contact_messages order by email");
  assert.deepEqual(messages.rows.map((row) => row.email), ["bir@example.com", "iki@example.com"]);
});

test("the contact form no longer uses useId and the journey mail path stays in place", async () => {
  const form = await readFile(new URL("../src/components/forms/contact-form.tsx", import.meta.url), "utf8");
  const intake = await readFile(new URL("../src/server/actions/intake.ts", import.meta.url), "utf8");
  const journey = intake.slice(intake.indexOf("export async function submitJourney"), intake.indexOf("function logContact"));
  assert.equal(form.includes("useId"), false);
  assert.match(form, /createContactAttempt/);
  assert.match(form, /disabled=\{pending\}/);
  assert.match(form, /sending\.current/);
  const contact = intake.slice(intake.indexOf("export async function submitContact"));
  const duplicateAt = contact.indexOf('contactFollowUp(result) === "duplicate"');
  const queueAt = contact.indexOf("enqueueOutbound");
  assert.ok(duplicateAt > 0 && queueAt > duplicateAt);
  assert.match(journey, /settleOutbound\(id\)/);
  assert.equal(journey.includes("contactFollowUp"), false);
});

async function contactDb() {
  const db = new PGlite();
  const files = ["001_init.sql", "002_telegram.sql", "003_phase3.sql", "004_phase4.sql", "005_phase41.sql", "006_phase42.sql"];
  for (const file of files) {
    await db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  }
  return db;
}

async function saveContact(db: PGlite, key: string, email: string) {
  const existing = await db.query<{ public_code: string }>(
    "select public_code from intake_submissions where idempotency_key = $1",
    [key],
  );
  const found = existing.rows[0]?.public_code;
  if (found) return { duplicate: true as const, publicCode: found };
  const publicCode = `ROTA-2026-${key.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`;
  const leads = await db.query<{ id: string }>(
    `insert into leads (public_code, full_name, email, contact_preference, contact_channels, source, status)
     values ($1, 'Test Aday', $2, 'email', '["email"]'::jsonb, 'website_contact', 'NEW')
     returning id`,
    [publicCode, email],
  );
  const leadId = leads.rows[0]?.id;
  if (!leadId) throw new Error("lead_insert_failed");
  await db.query(
    `insert into contact_messages (lead_id, full_name, email, message, contact_preference, status)
     values ($1, 'Test Aday', $2, 'Konu: Soru', 'email', 'new')`,
    [leadId, email],
  );
  await db.query(
    "insert into intake_submissions (idempotency_key, lead_id, public_code) values ($1, $2, $3)",
    [key, leadId, publicCode],
  );
  return { duplicate: false as const, publicCode };
}
