import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { noticeFromJob } from "../src/lib/outbound-policy.ts";
import { contactSchema, journeySchema } from "../src/lib/validation/assessment.ts";

test("email notice states stay distinct from a mere queue insert", () => {
  assert.equal(noticeFromJob("sent"), "sent");
  assert.equal(noticeFromJob("pending"), "pending");
  assert.equal(noticeFromJob("failed"), "failed");
  assert.equal(noticeFromJob(undefined), "failed");
});

test("the live application and contact forms require an email address", () => {
  const journey = {
    ce: "have" as const,
    src3: "info" as const,
    experience: "none" as const,
    german: "none" as const,
    family: "alone" as const,
    fullName: "Test Aday",
    city: "Testsehir",
    marketingOptIn: false,
    consent: true as const,
    disclaimerAck: true as const,
    idempotencyKey: "journey-email-1",
  };
  assert.equal(journeySchema.safeParse({ ...journey, email: "aday@example.com" }).success, true);
  assert.equal(journeySchema.safeParse({ ...journey, email: "" }).success, false);
  assert.equal(contactSchema.safeParse({
    fullName: "Test Aday",
    email: "aday@example.com",
    subject: "Soru",
    message: "Başvuru süreci hakkında yazıyorum.",
    consent: true,
    idempotencyKey: "contact-email-1",
  }).success, true);
  const stray = contactSchema.safeParse({
    fullName: "Test Aday",
    email: "aday@example.com",
    subject: "Soru",
    message: "Başvuru süreci hakkında yazıyorum.",
    consent: true,
    idempotencyKey: "contact-email-1",
    channels: ["telegram"],
    telegramHandle: "adayrota",
  });
  assert.equal(stray.success, true);
  if (stray.success) {
    assert.equal("telegramHandle" in stray.data, false);
    assert.equal("channels" in stray.data, false);
  }
});

test("public pages and the webhook no longer run the Telegram bot", async () => {
  const files = [
    "../src/app/(site)/page.tsx",
    "../src/app/(site)/iletisim/page.tsx",
    "../src/components/forms/precheck-wizard.tsx",
    "../src/components/forms/contact-form.tsx",
    "../src/server/actions/intake.ts",
    "../src/app/api/telegram/webhook/route.ts",
  ];
  const sources = await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), "utf8")));
  const joined = sources.join("\n");
  assert.equal(joined.includes("publicBotLink"), false);
  assert.equal(joined.includes("enqueueOutbound(\"telegram\""), false);
  assert.equal(joined.includes("notifyAdmin"), false);
  const tr = await readFile(new URL("../src/lib/i18n/tr.ts", import.meta.url), "utf8");
  assert.match(tr, /Almanya yolculuğunuz için ilk adımı birlikte atalım\./);
  assert.match(tr, /Bize Ulaşın/);
  assert.match(sources[0], /href="\/iletisim"/);
  assert.match(sources[5], /telegram_disabled/);
  assert.equal(sources[5].includes("runChatTurn"), false);
});

test("a failed email job does not remove the contact message", async () => {
  const db = new PGlite();
  const files = ["001_init.sql", "002_telegram.sql", "003_phase3.sql", "004_phase4.sql", "005_phase41.sql", "006_phase42.sql"];
  for (const file of files) {
    await db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  }
  await db.query(
    `insert into contact_messages (full_name, email, message, contact_preference)
     values ('Test Aday', 'aday@example.com', E'Konu: Soru\\n\\nMerhaba', 'email')`,
  );
  await db.query(
    `insert into outbound_jobs (kind, payload, status, last_error)
     values ('email', '{"purpose":"staff","to":"inbox@example.com","subject":"ROTA DE"}'::jsonb, 'failed', 'not_configured')`,
  );
  const messages = await db.query<{ email: string }>("select email from contact_messages where full_name = 'Test Aday'");
  assert.equal(messages.rows[0]?.email, "aday@example.com");
  const jobs = await db.query<{ kind: string; status: string }>(
    "select kind, status from outbound_jobs where payload->>'purpose' = 'staff'",
  );
  assert.equal(jobs.rows[0]?.kind, "email");
  assert.equal(jobs.rows[0]?.status, "failed");
});
