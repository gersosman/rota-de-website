import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { ASSISTANT_FALLBACK, assistantSystemPrompt } from "../src/lib/assistant/prompt.ts";
import { TRACKER_STAGES, verifierMatches } from "../src/lib/domain/tracker.ts";
import { PUBLIC_CODE, createPublicCode, isApplicationCode } from "../src/lib/public-code.ts";
import { journeySchema } from "../src/lib/validation/assessment.ts";
import { takeTurn } from "../src/lib/telegram/engine.ts";

const base = {
  media: false,
  step: "idle" as const,
  draft: {},
  welcomeEnabled: true,
  services: [],
  faqs: [],
  contactUrl: null,
};

test("new application codes are unguessable and still accept the old format", () => {
  const code = createPublicCode(2026);
  assert.match(code, PUBLIC_CODE);
  assert.equal(isApplicationCode(code), true);
  assert.equal(isApplicationCode("RD-2026-00001"), true);
  assert.equal(isApplicationCode("ROTA-2026-000001"), false);
  const again = createPublicCode(2026);
  assert.notEqual(code, again);
});

test("tracking requires the full email or phone, not a short suffix", () => {
  const record = { email: "aday@example.com", phone: "+90 555 123 45 67" };
  assert.equal(verifierMatches(record, "aday@example.com"), true);
  assert.equal(verifierMatches(record, "905551234567"), true);
  assert.equal(verifierMatches(record, "4567"), false);
  assert.equal(verifierMatches(record, "baska@example.com"), false);
});

test("telegram asks for a second factor before revealing a file", () => {
  const asked = takeTurn({ ...base, text: "ROTA-2026-AB23CD", callback: null });
  assert.equal(asked.effect.type, "none");
  assert.equal(asked.step, "verify");
  const checked = takeTurn({ ...base, text: "aday@example.com", callback: null, step: "verify", draft: { pendingCode: "ROTA-2026-AB23CD" } });
  assert.equal(checked.effect.type, "track");
  if (checked.effect.type === "track") {
    assert.equal(checked.effect.code, "ROTA-2026-AB23CD");
    assert.equal(checked.effect.verifier, "aday@example.com");
  }
});

test("the assistant prompt refuses guarantees and invented decisions", () => {
  const prompt = assistantSystemPrompt("Onaylı bilgi");
  assert.match(prompt, new RegExp(ASSISTANT_FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prompt, /uydurma/i);
  assert.match(prompt, /garantisi verme/i);
  assert.equal(TRACKER_STAGES.includes("received"), true);
  assert.equal(TRACKER_STAGES.includes("reviewing"), true);
  assert.notEqual(TRACKER_STAGES.indexOf("matching"), TRACKER_STAGES.indexOf("completed"));
});

test("the earlier journey payload still validates", () => {
  const parsed = journeySchema.safeParse({
    ce: "have",
    src3: "have",
    experience: "y5_plus",
    german: "none",
    family: "alone",
    fullName: "Ada Yılmaz",
    phone: "+49 151 12345678",
    email: "",
    city: "Ankara",
    contactPreference: "telegram",
    note: "Kısa not",
    marketingOptIn: false,
    consent: true,
    disclaimerAck: true,
    idempotencyKey: "journey-key-1",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.residence, "TR");
    assert.equal(parsed.data.availability, "later");
  }
});

test("opening a received file moves it to reviewing once", async () => {
  const db = new PGlite();
  const files = ["001_init.sql", "002_telegram.sql", "003_phase3.sql", "004_phase4.sql", "005_phase41.sql"];
  for (const file of files) {
    const sqlText = await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8");
    await db.exec(sqlText);
  }
  const security = await db.query<{ relrowsecurity: boolean }>(
    "select relrowsecurity from pg_class where relname = 'tracker_events'",
  );
  assert.equal(security.rows[0]?.relrowsecurity, true);
  await db.query(
    `insert into leads (public_code, full_name, contact_preference, source, status, tracker_stage)
     values ('ROTA-2026-AB23CD', 'Ada Yılmaz', 'phone', 'website_assessment', 'NEW', 'received')`,
  );
  const first = await db.query<{ id: string }>(
    `update leads set tracker_stage = 'reviewing'
     where public_code = 'ROTA-2026-AB23CD' and tracker_stage = 'received'
     returning id`,
  );
  assert.equal(first.rows.length, 1);
  await db.query(
    `insert into tracker_events (lead_id, from_stage, to_stage, public_message)
     values ($1, 'received', 'reviewing', 'İnceleniyor')`,
    [first.rows[0]?.id],
  );
  const second = await db.query(
    `update leads set tracker_stage = 'reviewing'
     where public_code = 'ROTA-2026-AB23CD' and tracker_stage = 'received'
     returning id`,
  );
  assert.equal(second.rows.length, 0);
  const stage = await db.query<{ tracker_stage: string }>(
    "select tracker_stage from leads where public_code = 'ROTA-2026-AB23CD'",
  );
  assert.equal(stage.rows[0]?.tracker_stage, "reviewing");
});

test("the public assistant route does not contain an API key", async () => {
  const route = await readFile(new URL("../src/app/api/assistant/route.ts", import.meta.url), "utf8");
  const footer = await readFile(new URL("../src/components/site/footer.tsx", import.meta.url), "utf8");
  assert.equal(route.includes("sk-"), false);
  assert.match(route, /OPENAI_API_KEY/);
  assert.equal(/Yasal bilgiler/.test(footer), false);
  assert.equal(/whatsapp/i.test(route), false);
});
