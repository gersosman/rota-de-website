import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { journeySchema } from "../src/lib/validation/assessment.ts";
import { takeTurn } from "../src/lib/telegram/engine.ts";
import { PIPELINE_STAGES } from "../src/lib/domain/pipeline.ts";
import { guide } from "../src/lib/content/germany.ts";

const base = {
  media: false,
  step: "idle" as const,
  draft: {},
  welcomeEnabled: true,
  services: [],
  faqs: [],
  contactUrl: null,
};

test("telegram welcome matches the public menu and does not promise a visa", () => {
  const turn = takeTurn({ ...base, text: "/start", callback: null });
  const text = turn.replies.map((item) => item.text).join(" ");
  const data = turn.replies.flatMap((item) => item.buttons.flat().map((button) => button.data));
  assert.match(text, /ROTA DE'ye hoş geldin/);
  assert.ok(data.includes("precheck"));
  assert.ok(data.includes("germany"));
  assert.ok(data.includes("track"));
  assert.ok(data.includes("human"));
  assert.doesNotMatch(text, /iş garantisi|vize onayı/i);
});

test("journey schema requires an email address and keeps marketing consent separate", () => {
  const missing = journeySchema.safeParse({
    ce: "have",
    src3: "info",
    experience: "none",
    german: "none",
    family: "alone",
    fullName: "Ada Yılmaz",
    email: "aday@example.com",
    city: "Ankara",
    marketingOptIn: false,
    consent: true,
    disclaimerAck: false,
    idempotencyKey: "journey-key-1",
  });
  assert.equal(missing.success, false);
  const noEmail = journeySchema.safeParse({
    ce: "have",
    src3: "have",
    experience: "y5_plus",
    german: "none",
    family: "alone",
    fullName: "Ada Yılmaz",
    email: "",
    city: "Ankara",
    channels: ["telegram"],
    marketingOptIn: false,
    consent: true,
    disclaimerAck: true,
    idempotencyKey: "journey-key-1",
  });
  assert.equal(noEmail.success, false);
  const parsed = journeySchema.safeParse({
    ce: "have",
    src3: "have",
    experience: "y5_plus",
    german: "none",
    family: "alone",
    fullName: "Ada Yılmaz",
    email: "aday@example.com",
    city: "Ankara",
    note: "Kısa not",
    marketingOptIn: false,
    consent: true,
    disclaimerAck: true,
    idempotencyKey: "journey-key-1",
  });
  assert.equal(parsed.success, true);
});

test("public copy does not offer WhatsApp or a 3000 euro salary", async () => {
  const tr = await readFile(new URL("../src/lib/i18n/tr.ts", import.meta.url), "utf8");
  const de = await readFile(new URL("../src/lib/i18n/de.ts", import.meta.url), "utf8");
  assert.equal(/whatsapp/i.test(tr), false);
  assert.equal(/whatsapp/i.test(de), false);
  assert.equal(/3\.000/.test(tr), false);
  assert.equal(/3\.000/.test(de), false);
});

test("germany guide cites the statute and does not treat the 15 month path as a right", () => {
  const text = guide.tr.map((section) => `${section.summary} ${section.paragraphs.join(" ")}`).join(" ");
  assert.match(text, /otomatik hak değildir/);
  assert.match(text, /SRC3/);
  assert.match(text, /Fahrerqualifizierungsnachweis/);
  assert.equal(guide.tr.some((section) => section.sourceUrl.includes("gesetze-im-internet.de")), true);
  assert.equal(PIPELINE_STAGES.includes("contract"), true);
  assert.equal(PIPELINE_STAGES.includes("visa_approved"), true);
  assert.notEqual(PIPELINE_STAGES.indexOf("contract"), PIPELINE_STAGES.indexOf("visa_approved"));
});
