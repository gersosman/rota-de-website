"use server";

import { randomBytes } from "node:crypto";
import { publicGate } from "@/server/actions/guards";
import { createAssessmentLead, createContactLead, createJourneyLead, findSubmission, requestDeletion } from "@/server/leads";
import { allowRate, hashValue } from "@/server/rate-limit";
import { contactInbox } from "@/server/mail";
import { enqueueOutbound, settleOutbound } from "@/server/outbound";
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

export async function submitContact(input: unknown) {
  const gate = await publicGate("contact", 8, 60 * 60);
  if (!gate.ok) return gate;
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid" as const };
  if (parsed.data.companyWebsite) return { ok: true as const, publicCode: null, duplicate: false };
  const email = parsed.data.email.trim().toLowerCase();
  if (!(await allowRate(`contact-email:${hashValue(email)}`, 5, 60 * 60))) return { ok: false as const, code: "rate" as const };
  try {
    const result = await createContactLead(parsed.data);
    let emailStatus: NoticeState | undefined;
    if (!result.duplicate && result.publicCode) {
      emailStatus = "failed";
      const inbox = contactInbox();
      if (inbox) {
        try {
          const id = await enqueueOutbound("email", {
            purpose: "staff",
            to: inbox,
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
          emailStatus = await settleOutbound(id);
        } catch (error) {
          console.error("outbound_enqueue_failed", { message: error instanceof Error ? error.message.slice(0, 180) : "unknown" });
        }
      }
    }
    return { ok: true as const, publicCode: result.publicCode, duplicate: result.duplicate, emailStatus };
  } catch (error) {
    console.error("contact_failed", error instanceof Error ? error.name : "error");
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
