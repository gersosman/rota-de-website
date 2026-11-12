"use server";

import { randomBytes } from "node:crypto";
import { publicGate } from "@/server/actions/guards";
import { createAssessmentLead, createContactLead, createJourneyLead, findSubmission, requestDeletion } from "@/server/leads";
import { allowRate, hashValue } from "@/server/rate-limit";
import { ceLabel, experienceLabel, src3Label } from "@/lib/domain/pipeline";
import { drainOutbound, enqueueOutbound } from "@/server/outbound";
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
  const identity = parsed.data.phone?.replace(/\D/g, "") || parsed.data.email?.trim().toLowerCase() || parsed.data.telegramHandle?.replace(/^@/, "").toLowerCase() || parsed.data.fullName;
  if (!(await allowRate(`journey-person:${hashValue(identity)}`, 8, 60 * 60))) return { ok: false as const, code: "rate" as const };
  try {
    const result = await createJourneyLead(parsed.data);
    const channels = parsed.data.channels?.length ? parsed.data.channels : parsed.data.contactPreference ? [parsed.data.contactPreference] : [];
    const email = channels.includes("email") && parsed.data.email?.trim() ? parsed.data.email.trim().toLowerCase() : "";
    if (!result.duplicate && result.publicCode) {
      const text = [
        "ROTA DE — Yeni başvuru",
        "",
        `Başvuru No: ${result.publicCode}`,
        `Ad Soyad: ${parsed.data.fullName}`,
        "Kaynak: Web sitesi",
        `CE: ${ceLabel(parsed.data.ce)}`,
        `SRC3: ${src3Label(parsed.data.src3)}`,
        `Deneyim: ${experienceLabel(parsed.data.experience)}`,
        "",
        "Admin panelinden görüntüle.",
      ].join("\n");
      try {
        if (email) await enqueueOutbound("email", { to: email, code: result.publicCode });
        await enqueueOutbound("telegram", { text });
      } catch (error) {
        console.error("outbound_enqueue_failed", { message: error instanceof Error ? error.message.slice(0, 180) : "unknown" });
      }
      void drainOutbound().catch((error: unknown) => {
        console.error("outbound_drain_failed", { message: error instanceof Error ? error.message.slice(0, 180) : "unknown" });
      });
    }
    return {
      ok: true as const,
      publicCode: result.publicCode,
      duplicate: result.duplicate,
      emailStatus: email ? ("queued" as const) : ("no-email" as const),
    };
  } catch (error) {
    const recovered = await findSubmission(parsed.data.idempotencyKey).catch(() => null);
    if (recovered) return { ok: true as const, publicCode: recovered, duplicate: true, emailStatus: "no-email" as const };
    return { ok: false as const, code: "unavailable" as const, ref: failureRef("journey_failed", error) };
  }
}

export async function submitContact(input: unknown) {
  const gate = await publicGate("contact", 8, 60 * 60);
  if (!gate.ok) return gate;
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid" as const };
  if (parsed.data.companyWebsite) return { ok: true as const, publicCode: null, duplicate: false };
  try {
    const result = await createContactLead(parsed.data);
    if (!result.duplicate && result.publicCode) {
      const channels = parsed.data.channels?.length ? parsed.data.channels : [parsed.data.contactPreference];
      const preference = channels.map((channel) => (channel === "telegram" ? "Telegram" : channel === "phone" ? "Telefon" : "E-posta")).join(", ");
      const text = [
        "ROTA DE — Yeni iletişim talebi",
        "",
        `Başvuru No: ${result.publicCode}`,
        `Ad Soyad: ${parsed.data.fullName}`,
        `Tercih: ${preference}${parsed.data.telegramHandle ? ` (${parsed.data.telegramHandle})` : ""}`,
        "Durum: Yeni",
        "",
        "Mesaj paneldedir. E-posta ve telefon bu bildirime yazılmadı.",
      ].join("\n");
      try {
        await enqueueOutbound("telegram", { text });
      } catch (error) {
        console.error("outbound_enqueue_failed", { message: error instanceof Error ? error.message.slice(0, 180) : "unknown" });
      }
      void drainOutbound().catch((error: unknown) => {
        console.error("outbound_drain_failed", { message: error instanceof Error ? error.message.slice(0, 180) : "unknown" });
      });
    }
    return { ok: true as const, publicCode: result.publicCode, duplicate: result.duplicate };
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
