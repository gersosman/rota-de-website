import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { contactResultView, contactTrace, inspectInbox, resendStatusCode } from "../src/lib/contact-mail.ts";

const closed = { present: false, accepted: false };

test("an empty inbox is neither present nor accepted", () => {
  assert.deepEqual(inspectInbox(undefined), closed);
  assert.deepEqual(inspectInbox(null), closed);
  assert.deepEqual(inspectInbox(""), closed);
  assert.deepEqual(inspectInbox(" \n\t "), closed);
});

test("a bare notify address is accepted after surrounding space or a newline", () => {
  const expected = { present: true, accepted: true };
  assert.deepEqual(inspectInbox("destek@rotade.org"), expected);
  assert.deepEqual(inspectInbox("  destek@rotade.org\n"), expected);
});

test("a display-name mailbox is present but not accepted", () => {
  assert.deepEqual(inspectInbox("Ad <destek@rotade.org>"), { present: true, accepted: false });
});

test("a saved contact with an unaccepted inbox never queues or attempts mail", () => {
  const log = contactTrace({
    branch: "created",
    recordCreated: true,
    inbox: inspectInbox("Ad <destek@rotade.org>"),
    queued: false,
    attempted: false,
    emailStatus: "failed",
    errorCode: "not_configured",
  });
  assert.equal(log.inboxPresent, true);
  assert.equal(log.inboxAccepted, false);
  assert.equal(log.queued, false);
  assert.equal(log.attempted, false);
  assert.equal(log.emailStatus, "failed");
  assert.equal(log.errorCode, "not_configured");
  assert.equal(contactResultView(log).toString(), "unsent");
  assert.equal(JSON.stringify(log).includes("@"), false);
});

test("a queued staff rejection is an attempt and the screen does not say the mail was sent", () => {
  assert.equal(resendStatusCode(422), "resend_4xx");
  assert.equal(resendStatusCode(503), "resend_5xx");
  const log = contactTrace({
    branch: "created",
    recordCreated: true,
    inbox: inspectInbox("destek@rotade.org"),
    queued: true,
    attempted: true,
    emailStatus: "failed",
    errorCode: resendStatusCode(422),
  });
  assert.equal(log.attempted, true);
  assert.equal(log.emailStatus, "failed");
  assert.equal(log.errorCode, "resend_4xx");
  assert.equal(contactResultView(log), "unsent");
  assert.notEqual(contactResultView(log), "sent");
});

test("a successful staff send is the only state that says the notice was sent", () => {
  const log = contactTrace({
    branch: "created",
    recordCreated: true,
    inbox: inspectInbox("destek@rotade.org"),
    queued: true,
    attempted: true,
    emailStatus: "sent",
    errorCode: "ok",
  });
  assert.equal(contactResultView(log), "sent");
});

test("a staff network failure is not wired into the application sender", async () => {
  const mail = await readFile(new URL("../src/server/mail.ts", import.meta.url), "utf8");
  const application = mail.slice(
    mail.indexOf("export async function sendApplicationCode"),
    mail.indexOf("export async function sendStaffNotice"),
  );
  assert.equal(application.includes("resendStatusCode"), false);
  assert.equal(application.includes("resend_network"), false);
  assert.match(application, /return response\.ok \? "sent" : "failed"/);
  const intake = await readFile(new URL("../src/server/actions/intake.ts", import.meta.url), "utf8");
  const journey = intake.slice(intake.indexOf("export async function submitJourney"), intake.indexOf("function logContact"));
  assert.equal(journey.includes("settleStaffOutbound"), false);
  assert.equal(journey.includes("sendStaffNotice"), false);
  assert.match(journey, /settleOutbound\(id\)/);
  const log = contactTrace({
    branch: "created",
    recordCreated: true,
    inbox: inspectInbox("destek@rotade.org"),
    queued: true,
    attempted: true,
    emailStatus: "failed",
    errorCode: "resend_network",
  });
  assert.equal(contactResultView(log), "unsent");
});

test("honeypot, rate, origin, and idempotency create no record and attempt no mail", () => {
  const cases = [
    contactTrace({ branch: "honeypot", recordCreated: false, inbox: closed, queued: false, attempted: false, emailStatus: "none", errorCode: "none" }),
    contactTrace({ branch: "rate", reason: "ip", recordCreated: false, inbox: closed, queued: false, attempted: false, emailStatus: "none", errorCode: "rate" }),
    contactTrace({ branch: "rate", reason: "address", recordCreated: false, inbox: closed, queued: false, attempted: false, emailStatus: "none", errorCode: "rate" }),
    contactTrace({ branch: "origin", recordCreated: false, inbox: closed, queued: false, attempted: false, emailStatus: "none", errorCode: "origin" }),
    contactTrace({ branch: "duplicate", reason: "idempotency", recordCreated: false, inbox: closed, queued: false, attempted: false, emailStatus: "none", errorCode: "none" }),
  ];
  for (const log of cases) {
    assert.equal(log.recordCreated, false);
    assert.equal(log.attempted, false);
    assert.equal(log.queued, false);
  }
  assert.equal(contactResultView(cases[0]), "saved");
  assert.equal(contactResultView({ duplicate: true, recordCreated: false, emailStatus: "none" }), "duplicate");
});

test("the contact screen does not leave a saved heading alone when mail was not sent", async () => {
  const tr = await readFile(new URL("../src/lib/i18n/tr.ts", import.meta.url), "utf8");
  const form = await readFile(new URL("../src/components/forms/contact-form.tsx", import.meta.url), "utf8");
  assert.match(tr, /savedUnsent: "Mesajınız kaydedildi\. E-posta bildirimi gönderilemedi\. Kayıt duruyor\."/);
  assert.match(tr, /savedPending: "Mesajınız kaydedildi\. E-posta bildirimi henüz tamamlanmadı\."/);
  assert.match(form, /contactResultView/);
  assert.match(form, /labels\.savedUnsent/);
  assert.match(form, /labels\.savedPending/);
  assert.equal(form.includes("labels.done") && form.includes("view === \"unsent\""), true);
});
