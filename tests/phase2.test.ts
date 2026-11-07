import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { secretEquals } from "../src/lib/security/hmac.ts";
import { labelForCallback, takeTurn } from "../src/lib/telegram/engine.ts";

const base = {
  media: false,
  step: "idle" as const,
  draft: {},
  welcomeEnabled: true,
  services: [],
  faqs: [],
  contactUrl: null,
};

test("start offers the menu and does not ask for a phone number", () => {
  const turn = takeTurn({ ...base, text: "/start", callback: null });
  const text = turn.replies.map((item) => item.text).join(" ");
  const data = turn.replies.flatMap((item) => item.buttons.flat().map((button) => button.data));
  assert.equal(turn.effect.type, "none");
  assert.equal(labelForCallback("precheck"), "Ön kayıt");
  assert.ok(data.includes("precheck"));
  assert.ok(data.includes("human"));
  assert.doesNotMatch(text, /numaranızı yazın|telefonunuzu gönderin|\+90/i);
});

test("precheck opens a file only after explicit confirmation", () => {
  let step = takeTurn({ ...base, text: "", callback: "precheck" });
  step = takeTurn({ ...base, text: "", callback: "c:TR", step: step.step, draft: step.draft });
  step = takeTurn({ ...base, text: "", callback: "ce:yes", step: step.step, draft: step.draft });
  step = takeTurn({ ...base, text: "", callback: "ex:y1_3", step: step.step, draft: step.draft });
  step = takeTurn({ ...base, text: "", callback: "de:A", step: step.step, draft: step.draft });
  step = takeTurn({ ...base, text: "Demo Aday", callback: null, step: step.step, draft: step.draft });
  assert.equal(step.effect.type, "none");
  assert.equal(step.step, "confirm");
  const saved = takeTurn({ ...base, text: "", callback: "ok:yes", step: step.step, draft: step.draft });
  assert.equal(saved.effect.type, "lead");
  if (saved.effect.type === "lead") {
    assert.equal(saved.effect.draft.name, "Demo Aday");
    assert.equal(saved.effect.draft.country, "TR");
    assert.equal(saved.effect.draft.ce, "yes");
  }
  assert.match(saved.replies[0]?.text ?? "", /onayı değildir/i);
});

test("an open question is not answered as a legal decision", () => {
  const turn = takeTurn({ ...base, text: "Vize onayımı ver", callback: null, welcomeEnabled: false });
  const text = turn.replies.map((item) => item.text).join(" ");
  assert.equal(turn.effect.type, "none");
  assert.match(text, /otomatik karşılama kapalı/i);
  assert.doesNotMatch(text, /onaylandı|uygun bulundu|çalışma izni verildi/i);
});

test("webhook secret compare rejects a different length", () => {
  assert.equal(secretEquals("a-secret-value-16", "a-secret-value-16"), true);
  assert.equal(secretEquals("a-secret-value-16", "a-secret-value-99"), false);
  assert.equal(secretEquals("a-secret-value-16", null), false);
});

test("telegram tables enable row level security", async () => {
  const db = new PGlite();
  const first = await readFile(new URL("../migrations/001_init.sql", import.meta.url), "utf8");
  const second = await readFile(new URL("../migrations/002_telegram.sql", import.meta.url), "utf8");
  await db.exec(first);
  await db.exec(second);
  const security = await db.query<{ relrowsecurity: boolean }>(
    "select relrowsecurity from pg_class where relname = 'telegram_updates'",
  );
  assert.equal(security.rows[0]?.relrowsecurity, true);
  await db.query("insert into telegram_updates (update_id) values (7)");
  const again = await db.query("insert into telegram_updates (update_id) values (7) on conflict do nothing returning update_id");
  assert.equal(again.rows.length, 0);
});
