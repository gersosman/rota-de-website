"use server";

import { publicGate } from "@/server/actions/guards";
import { createAssessmentLead, createContactLead, createJourneyLead, findSubmission, requestDeletion } from "@/server/leads";
import { allowRate, hashValue } from "@/server/rate-limit";
import { ceLabel, experienceLabel, src3Label } from "@/lib/domain/pipeline";
import { notifyAdmin } from "@/server/telegram/notify";
import { assessmentSchema, contactSchema, deletionSchema, journeySchema } from "@/lib/validation/assessment";

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
  const gate = await publicGate("journey", 8, 60 * 60);
  if (!gate.ok) return gate;
  const parsed = journeySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid" as const };
  if (parsed.data.companyWebsite) return { ok: true as const, publicCode: null, duplicate: false };
  const phoneBucket = `journey-phone:${hashValue(parsed.data.phone.replace(/\D/g, ""))}`;
  if (!(await allowRate(phoneBucket, 5, 60 * 60))) return { ok: false as const, code: "rate" as const };
  try {
    const result = await createJourneyLead(parsed.data);
    if (!result.duplicate && result.publicCode) {
      await notifyAdmin(
        [
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
        ].join("\n"),
      ).catch(() => "failed" as const);
    }
    return { ok: true as const, publicCode: result.publicCode, duplicate: result.duplicate };
  } catch (error) {
    console.error("journey_failed", error instanceof Error ? error.name : "error");
    const recovered = await findSubmission(parsed.data.idempotencyKey).catch(() => null);
    if (recovered) return { ok: true as const, publicCode: recovered, duplicate: true };
    return { ok: false as const, code: "unavailable" as const };
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
      const preference = parsed.data.contactPreference === "telegram" ? "Telegram" : parsed.data.contactPreference === "phone" ? "Telefon" : parsed.data.contactPreference === "email" ? "E-posta" : "Belirtilmedi";
      await notifyAdmin(
        [
          "ROTA DE — Yeni iletişim talebi",
          "",
          `Başvuru No: ${result.publicCode}`,
          `Ad Soyad: ${parsed.data.fullName}`,
          `Tercih: ${preference}`,
          "Durum: Yeni",
          "",
          "Mesaj paneldedir. E-posta ve telefon bu bildirime yazılmadı.",
        ].join("\n"),
      ).catch(() => "failed" as const);
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
