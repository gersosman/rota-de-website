import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { contactSchema } from "../src/lib/validation/assessment.ts";

test("contact schema stores the message fields and rejects a missing consent", () => {
  const parsed = contactSchema.safeParse({
    fullName: "Ada Yılmaz",
    email: "ada@example.com",
    message: "Süreci sormak istiyorum.",
    contactPreference: "telegram",
    telegramHandle: "adayrota",
    consent: true,
    idempotencyKey: "contact-key-1",
  });
  assert.equal(parsed.success, true);
  const missingHandle = contactSchema.safeParse({
    fullName: "Ada Yılmaz",
    email: "ada@example.com",
    message: "Süreci sormak istiyorum.",
    contactPreference: "telegram",
    consent: true,
    idempotencyKey: "contact-key-1",
  });
  assert.equal(missingHandle.success, false);
  const denied = contactSchema.safeParse({
    fullName: "Ada Yılmaz",
    email: "ada@example.com",
    message: "Süreci sormak istiyorum.",
    contactPreference: "telegram",
    consent: false,
    idempotencyKey: "contact-key-1",
  });
  assert.equal(denied.success, false);
  const phoneOnly = contactSchema.safeParse({
    fullName: "Ada Yılmaz",
    email: "",
    message: "Süreci sormak istiyorum.",
    contactPreference: "phone",
    channels: ["phone"],
    phone: "+49 151 12345678",
    consent: true,
    idempotencyKey: "contact-key-2",
  });
  assert.equal(phoneOnly.success, true);
  const badEmail = contactSchema.safeParse({
    fullName: "Ada Yılmaz",
    email: "eksik",
    message: "Süreci sormak istiyorum.",
    contactPreference: "email",
    channels: ["email"],
    consent: true,
    idempotencyKey: "contact-key-3",
  });
  assert.equal(badEmail.success, false);
});

test("phase 4 tables enable row level security and start empty", async () => {
  const db = new PGlite();
  for (const name of ["001_init.sql", "002_telegram.sql", "003_phase3.sql", "004_phase4.sql"]) {
    const sqlText = await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8");
    await db.exec(sqlText);
  }
  for (const table of ["contact_messages", "employers", "job_opportunities", "candidate_matches", "testimonials"]) {
    const security = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname = $1",
      [table],
    );
    assert.equal(security.rows[0]?.relrowsecurity, true, table);
  }
  const employers = await db.query<{ count: string }>("select count(*)::text as count from employers");
  const stories = await db.query<{ count: string }>("select count(*)::text as count from testimonials");
  assert.equal(employers.rows[0]?.count, "0");
  assert.equal(stories.rows[0]?.count, "0");
});

test("public pages do not import the removed WhatsApp client", async () => {
  const home = await readFile(new URL("../src/app/(site)/page.tsx", import.meta.url), "utf8");
  const contact = await readFile(new URL("../src/app/(site)/iletisim/page.tsx", import.meta.url), "utf8");
  const journey = await readFile(new URL("../src/components/forms/journey-form.tsx", import.meta.url), "utf8");
  assert.equal(/whatsapp/i.test(`${home}\n${contact}\n${journey}`), false);
});
