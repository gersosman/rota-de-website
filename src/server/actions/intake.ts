"use server";

import { randomBytes } from "node:crypto";
import { publicGate } from "@/server/actions/guards";
import { createAssessmentLead, createContactLead, createJourneyLead, findSubmission, requestDeletion } from "@/server/leads";
import { allowRate, hashValue } from "@/server/rate-limit";
import { contactFollowUp, contactTrace, type ContactLog } from "@/lib/contact-mail";
import { contactInbox, contactInboxDiagnostics } from "@/server/mail";
import { enqueueOutbound, settleOutbound, settleStaffOutbound } from "@/server/outbound";
import type { NoticeState } from "@/lib/outbound-policy";
import { assessmentSchema, contactSchema, deletionSchema, journeySchema } from "@/lib/validation/assessment";

function failureRef(scope: string, error: unknown): string {
  const ref = randomBytes(4).toString("hex");
  const detail = error && typeof error === "object" ? (error as { code?: unknown; constraint?: unknown; table?: unknown; column?: unknown }) : {};
  console.error(scope, {
    ref,
    name: error instanceof Error ? error.name : "unknown",
    code: typeof detail.code === "string" ? detail.code : undefined,
    constraint: typeof detail.constraint === "string" ? detail.constraint : undefined,
    table: typeof detail.table === "string" ? detail.table : undefined,
    column: typeof detail.column === "string" ? detail.column : undefined,
    message: error instanceof Error ? error.message.slice(0, 240) : "unknown",
  });
  return ref;
}

export async function submitAssessment(input: unknown) {
  const gate = await publicGate("assessment", 8, 60 * 60);
  if (!gate.ok) return gate;
  const parsed = assessmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid" as const };
  if (parsed.data.companyWebsite) return { ok: true as const, publicCode: null, duplicate: false };
  const emailBucket = `assessment-email:${hashValue(parsed.data.email.toLowerCase())}`;
  if (!(await allowRate(emailBucket, 5, 60 * 60))) return { ok: false as const, code: "rate" as const };
  try {
    const result = await createAssessmentLead(parsed.data);
    return { ok: true as const, publicCode: result.publicCode, duplicate: result.duplicate };
  } catch (error) {
    console.error("assessment_failed", error instanceof Error ? error.name : "error");
    const recovered = await findSubmission(parsed.data.idempotencyKey).catch(() => null);
    if (recovered) return { ok: true as const, publicCode: recovered, duplicate: true };
    return { ok: false as const, code: "unavailable" as const };
  }
}

export async function submitJourney(input: unknown) {
  const gate = await publicGate("journey", 12, 60 * 60);
  if (!gate.ok) return gate;
  const parsed = journeySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid" as const };
  if (parsed.data.companyWebsite) return { ok: true as const, publicCode: null, duplicate: false };
  const identity = parsed.data.email.trim().toLowerCase();
  if (!(await allowRate(`journey-person:${hashValue(identity)}`, 8, 60 * 60))) return { ok: false as const, code: "rate" as const };
  try {
    const result = await createJourneyLead(parsed.data);
    let emailStatus: NoticeState | undefined;
    if (!result.duplicate && result.publicCode) {
      emailStatus = "failed";
      try {
        const id = await enqueueOutbound("email", {
          purpose: "application",
          to: identity,
          code: result.publicCode,
        });
        emailStatus = await settleOutbound(id);
      } catch (error) {
        console.error("outbound_enqueue_failed", { message: error instanceof Error ? error.message.slice(0, 180) : "unknown" });
      }
    }
    return {
      ok: true as const,
      publicCode: result.publicCode,
      duplicate: result.duplicate,
      emailStatus,
    };
  } catch (error) {
    const recovered = await findSubmission(parsed.data.idempotencyKey).catch(() => null);
    if (recovered) return { ok: true as const, publicCode: recovered, duplicate: true };
    return { ok: false as const, code: "unavailable" as const, ref: failureRef("journey_failed", error) };
  }
}

function logContact(entry: ContactLog) {
  console.info("contact_submit", entry);
}

export async function submitContact(input: unknown) {
  const inbox = contactInboxDiagnostics();
  const gate = await publicGate("contact", 8, 60 * 60);
  if (!gate.ok) {
    logContact(contactTrace({
      branch: gate.code === "rate" ? "rate" : gate.code === "origin" ? "origin" : "invalid",
      reason: gate.code === "rate" ? "ip" : "none",
      recordCreated: false,
      inbox,
      queued: false,
      attempted: false,
      emailStatus: "none",
      errorCode: gate.code,
    }));
    return gate;
  }
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    logContact(contactTrace({
      branch: "invalid",
      recordCreated: false,
      inbox,
      queued: false,
      attempted: false,
      emailStatus: "none",
      errorCode: "invalid",
    }));
    return { ok: false as const, code: "invalid" as const };
  }
  if (parsed.data.companyWebsite) {
    logContact(contactTrace({
      branch: "honeypot",
      recordCreated: false,
      inbox,
      queued: false,
      attempted: false,
      emailStatus: "none",
      errorCode: "none",
    }));
    return { ok: true as const, publicCode: null, duplicate: false, recordCreated: false, emailStatus: "none" as const };
  }
  const email = parsed.data.email.trim().toLowerCase();
  if (!(await allowRate(`contact-email:${hashValue(email)}`, 5, 60 * 60))) {
    logContact(contactTrace({
      branch: "rate",
      reason: "address",
      recordCreated: false,
      inbox,
      queued: false,
      attempted: false,
      emailStatus: "none",
      errorCode: "rate",
    }));
    return { ok: false as const, code: "rate" as const };
  }
  try {
    const result = await createContactLead(parsed.data);
    if (contactFollowUp(result) === "duplicate") {
      logContact(contactTrace({
        branch: "duplicate",
        reason: "idempotency",
        recordCreated: false,
        inbox,
        queued: false,
        attempted: false,
        emailStatus: "none",
        errorCode: "none",
      }));
      return { ok: true as const, publicCode: result.publicCode, duplicate: true, recordCreated: false, emailStatus: "none" as const };
    }
    const target = contactInbox();
    if (!target) {
      logContact(contactTrace({
        branch: "created",
        recordCreated: true,
        inbox,
        queued: false,
        attempted: false,
        emailStatus: "failed",
        errorCode: "not_configured",
      }));
      return { ok: true as const, publicCode: result.publicCode, duplicate: false, recordCreated: true, emailStatus: "failed" as const };
    }
    try {
      const id = await enqueueOutbound("email", {
        purpose: "staff",
        to: target,
        subject: `ROTA DE — ${parsed.data.subject.trim().slice(0, 120)}`,
        text: [
          "Yeni iletişim mesajı",
          "",
          `Kayıt: ${result.publicCode}`,
          `Ad soyad: ${parsed.data.fullName.trim()}`,
          `E-posta: ${email}`,
          `Konu: ${parsed.data.subject.trim()}`,
          "",
          parsed.data.message.trim(),
        ].join("\n"),
      });
      const report = await settleStaffOutbound(id);
      logContact(contactTrace({
        branch: "created",
        recordCreated: true,
        inbox,
        queued: true,
        attempted: report.attempted,
        emailStatus: report.emailStatus,
        errorCode: report.errorCode,
      }));
      return { ok: true as const, publicCode: result.publicCode, duplicate: false, recordCreated: true, emailStatus: report.emailStatus };
    } catch (error) {
      console.error("outbound_enqueue_failed", error instanceof Error ? error.name : "error");
      logContact(contactTrace({
        branch: "created",
        recordCreated: true,
        inbox,
        queued: false,
        attempted: false,
        emailStatus: "failed",
        errorCode: "enqueue_failed",
      }));
      return { ok: true as const, publicCode: result.publicCode, duplicate: false, recordCreated: true, emailStatus: "failed" as const };
    }
  } catch (error) {
    console.error("contact_failed", error instanceof Error ? error.name : "error");
    logContact(contactTrace({
      branch: "unavailable",
      recordCreated: false,
      inbox,
      queued: false,
      attempted: false,
      emailStatus: "none",
      errorCode: "unavailable",
    }));
    return { ok: false as const, code: "unavailable" as const };
  }
}

export async function submitDeletion(input: unknown) {
  const gate = await publicGate("deletion", 5, 60 * 60);
  if (!gate.ok) return { ok: false as const, code: gate.code };
  const parsed = deletionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid" as const };
  try {
    await requestDeletion(parsed.data.email);
  } catch (error) {
    console.error("deletion_failed", error instanceof Error ? error.name : "error");
    return { ok: false as const, code: "unavailable" as const };
  }
  return { ok: true as const };
}
