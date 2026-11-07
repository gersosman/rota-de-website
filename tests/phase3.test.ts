import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { signHmacSha256 } from "../src/lib/security/hmac.ts";
import { buttonTitlesFit, buttonsForWaStep, takeWhatsappTurn, type WaStep } from "../src/lib/whatsapp/engine.ts";
import { parseWhatsappBody } from "../src/lib/whatsapp/parse.ts";
import { withinServiceWindow } from "../src/lib/whatsapp/window.ts";
import { journeySchema } from "../src/lib/validation/assessment.ts";

const base = { step: "idle" as const, draft: {}, welcomeEnabled: true };

test("whatsapp welcome does not ask for a phone or promise a visa", () => {
  const turn = takeWhatsappTurn({ ...base, text: "/start", button: null });
  const text = turn.replies.map((item) => item.text).join(" ");
  assert.match(text, /ROTA DE'ye hoş geldin/);
  assert.equal(buttonTitlesFit(turn), true);
  assert.doesNotMatch(text, /numaranı yaz|vize onayı|iş garantisi/i);
});

test("whatsapp precheck creates a lead only after confirmation", () => {
  let step = takeWhatsappTurn({ ...base, text: "", button: "precheck" });
  const path: Array<[string, string | null]> = [
    ["", "ce:yes"],
    ["", "src:have"],
    ["", "ex:y1_3"],
    ["", "de:none"],
    ["", "fa:alone"],
    ["Ada Yılmaz", null],
    ["Ankara", null],
  ];
  for (const [text, button] of path) {
    step = takeWhatsappTurn({ ...base, text, button, step: step.step, draft: step.draft });
    assert.equal(step.effect.type, "none");
    assert.equal(buttonTitlesFit(step), true);
  }
  const saved = takeWhatsappTurn({ ...base, text: "", button: "ok:yes", step: step.step, draft: step.draft });
  assert.equal(saved.effect.type, "lead");
  assert.match(saved.replies.map((item) => item.text).join(" "), /onayı değildir/i);
});

test("whatsapp handoff and button titles stay within platform limits", () => {
  const handoff = takeWhatsappTurn({ ...base, text: "", button: "human" });
  assert.equal(handoff.effect.type, "handoff");
  const steps: WaStep[] = ["idle", "ce", "src3", "experience", "german", "family", "spouse", "children", "confirm"];
  for (const step of steps) {
    for (const button of buttonsForWaStep(step)) assert.ok(button.title.length <= 20, button.title);
  }
});

test("service window is 24 hours and signatures reject a tampered body", () => {
  const now = new Date("2026-11-07T12:00:00Z");
  assert.equal(withinServiceWindow(new Date("2026-11-07T11:00:00Z"), now), true);
  assert.equal(withinServiceWindow(new Date("2026-11-06T11:00:00Z"), now), false);
  assert.equal(withinServiceWindow(null, now), false);
  const body = JSON.stringify({ entry: [] });
  const secret = "meta-app-secret-value";
  const signature = `sha256=${signHmacSha256(secret, body)}`;
  assert.equal(signHmacSha256(secret, body), signature.slice(7));
  assert.notEqual(signHmacSha256(secret, `${body} `), signature.slice(7));
});

test("whatsapp parser keeps the sender and ignores a bad status", () => {
  const events = parseWhatsappBody({
    entry: [{
      changes: [{
        value: {
          messages: [{ id: "wamid.HBgLMTIzNDU2Nzg5", from: "4915112345678", type: "text", text: { body: "Merhaba" } }],
          statuses: [{ id: "wamid.outbound", status: "not-a-status" }, { id: "wamid.outbound", status: "delivered" }],
        },
      }],
    }],
  });
  assert.equal(events.length, 2);
  assert.equal(events[0]?.kind, "message");
  if (events[0]?.kind === "message") assert.equal(events[0].from, "4915112345678");
  assert.equal(events[1]?.kind, "status");
});

test("journey schema keeps marketing consent separate and blocks missing acknowledgement", () => {
  const parsed = journeySchema.safeParse({
    ce: "have",
    src3: "info",
    experience: "none",
    german: "none",
    family: "alone",
    fullName: "Ada Yılmaz",
    phone: "+49 151 12345678",
    email: "",
    city: "Ankara",
    whatsappOptIn: true,
    marketingOptIn: false,
    consent: true,
    disclaimerAck: false,
    idempotencyKey: "journey-key-1",
  });
  assert.equal(parsed.success, false);
});

test("phase 3 tables enable row level security and there is no broadcast sender", async () => {
  const db = new PGlite();
  for (const name of ["001_init.sql", "002_telegram.sql", "003_phase3.sql"]) {
    const sqlText = await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8");
    await db.exec(sqlText);
  }
  const security = await db.query<{ relrowsecurity: boolean }>(
    "select relrowsecurity from pg_class where relname = 'whatsapp_events'",
  );
  assert.equal(security.rows[0]?.relrowsecurity, true);
  const source = await readFile(new URL("../src/server/whatsapp/inbox.ts", import.meta.url), "utf8");
  assert.equal(source.includes("broadcast"), false);
  assert.match(source, /withinServiceWindow/);
});
