import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { foldCity, suggestCities } from "../src/lib/cities.ts";
import { verifierMatches } from "../src/lib/domain/tracker.ts";
import { nextAttemptDelayMs } from "../src/lib/outbound-policy.ts";
import { journeySchema } from "../src/lib/validation/assessment.ts";

const legacy = {
  ce: "have" as const,
  src3: "have" as const,
  experience: "y5_plus" as const,
  german: "none" as const,
  family: "alone" as const,
  fullName: "Ada Yılmaz",
  phone: "+49 151 12345678",
  email: "",
  city: "Ankara",
  contactPreference: "telegram" as const,
  marketingOptIn: false,
  consent: true as const,
  disclaimerAck: true as const,
  idempotencyKey: "journey-key-42",
};

test("city suggestions match German and Turkish names without an external lookup", () => {
  const kam = suggestCities("Kam").map((city) => city.n);
  assert.equal(kam.includes("Kamp-Lintfort"), true);
  assert.equal(kam.includes("Karlsruhe"), true);
  assert.equal(suggestCities("k").length, 0);
  assert.equal(foldCity("İstanbul"), foldCity("Istanbul"));
  assert.equal(suggestCities("ist").some((city) => foldCity(city.n) === "istanbul"), true);
  assert.equal(suggestCities("ANK").some((city) => city.n === "Ankara"), true);
});

test("a journey can name one channel or several, and the older payload still validates", () => {
  assert.equal(journeySchema.safeParse(legacy).success, true);
  const emailOnly = journeySchema.safeParse({
    ...legacy,
    phone: "",
    email: "aday@example.com",
    channels: ["email"],
    contactPreference: "email",
  });
  assert.equal(emailOnly.success, true);
  const both = journeySchema.safeParse({
    ...legacy,
    email: "aday@example.com",
    telegramHandle: "@adayrota",
    channels: ["phone", "telegram"],
  });
  assert.equal(both.success, true);
  assert.equal(journeySchema.safeParse({ ...legacy, channels: [], contactPreference: undefined }).success, false);
  assert.equal(
    journeySchema.safeParse({ ...legacy, phone: "", channels: ["email"], email: "eksik" }).success,
    false,
  );
  assert.equal(
    journeySchema.safeParse({ ...legacy, channels: ["telegram"], telegramHandle: "a" }).success,
    false,
  );
});

test("tracking accepts the telegram username when no phone was stored", () => {
  const record = { email: null, phone: null, telegram: "@adayrota" };
  assert.equal(verifierMatches(record, "adayrota"), true);
  assert.equal(verifierMatches(record, "@adayrota"), true);
  assert.equal(verifierMatches(record, "baska"), false);
});

test("notification retries wait longer and a failed notice does not remove the application", async () => {
  assert.ok(nextAttemptDelayMs(1) < nextAttemptDelayMs(3));
  const migration = await readFile(new URL("../migrations/005_phase41.sql", import.meta.url), "utf8");
  assert.match(migration, /availability/);
  const db = new PGlite();
  const files = ["001_init.sql", "002_telegram.sql", "003_phase3.sql", "004_phase4.sql", "005_phase41.sql", "006_phase42.sql"];
  for (const file of files) {
    await db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  }
  await db.query(
    `insert into leads (public_code, full_name, contact_preference, phone, city, country, availability, contact_channels, source, status)
     values ('ROTA-2026-KAM42A', 'Ada Yılmaz', 'phone', '+4915112345678', 'Karlsruhe', 'TR', 'later', '["phone"]'::jsonb, 'website_assessment', 'NEW')`,
  );
  await db.query(
    `insert into outbound_jobs (kind, payload, status, last_error) values ('telegram', '{"text":"x"}'::jsonb, 'failed', 'not_configured')`,
  );
  const leads = await db.query<{ public_code: string }>("select public_code from leads where full_name = 'Ada Yılmaz'");
  assert.equal(leads.rows[0]?.public_code, "ROTA-2026-KAM42A");
  const again = await db.query<{ public_code: string }>(
    `select public_code from leads
     where lower(full_name) = lower($1)
       and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $2
       and created_at > now() - interval '30 minutes'`,
    ["Ada Yılmaz", "4915112345678"],
  );
  assert.equal(again.rows[0]?.public_code, "ROTA-2026-KAM42A");
  const legacy = new PGlite();
  for (const file of ["001_init.sql", "002_telegram.sql", "003_phase3.sql", "004_phase4.sql"]) {
    await legacy.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  }
  await assert.rejects(
    legacy.query(
      `insert into leads (public_code, full_name, contact_preference, city, availability, source, status)
       values ('ROTA-2026-OLD001', 'Eski Kayıt', 'phone', 'Ankara', 'later', 'website_assessment', 'NEW')`,
    ),
  );
});
