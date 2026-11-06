"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/format";
import { companySchema, faqSchema, legislationSchema, retentionSchema } from "@/lib/validation/assessment";
import { changePassword, requirePanel, rotateRecoveryCodes } from "@/server/auth";
import { deleteFaq, purgeByRetention, saveCompany, saveFaq, saveLegislation, saveRetention } from "@/server/knowledge";

export async function saveCompanyAction(formData: FormData) {
  const admin = await requirePanel();
  const parsed = companySchema.safeParse({
    legalName: formData.get("legalName"),
    legalForm: formData.get("legalForm"),
    addressLine: formData.get("addressLine"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    country: formData.get("country"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone"),
    registerCourt: formData.get("registerCourt"),
    registerNumber: formData.get("registerNumber"),
    vatId: formData.get("vatId"),
    responsiblePerson: formData.get("responsiblePerson"),
  });
  if (!parsed.success) return;
  await saveCompany(admin.profileId, parsed.data);
  revalidatePath("/admin/ayarlar");
  revalidatePath("/impressum");
  revalidatePath("/datenschutz");
  revalidatePath("/agb");
  revalidatePath("/iptal-iade");
}

export async function saveRetentionAction(formData: FormData) {
  const admin = await requirePanel();
  const parsed = retentionSchema.safeParse({
    leadDays: formData.get("leadDays"),
    auditDays: formData.get("auditDays"),
  });
  if (!parsed.success) return;
  await saveRetention(admin.profileId, parsed.data.leadDays, parsed.data.auditDays);
  revalidatePath("/admin/ayarlar");
}

export async function purgeRetentionAction() {
  const admin = await requirePanel();
  await purgeByRetention(admin.profileId);
  revalidatePath("/admin/ayarlar");
  revalidatePath("/admin");
}

export async function saveLegislationAction(formData: FormData) {
  const admin = await requirePanel();
  const parsed = legislationSchema.safeParse({
    versionLabel: formData.get("versionLabel"),
    reviewStatus: formData.get("reviewStatus"),
    summaryTr: formData.get("summaryTr"),
    summaryDe: formData.get("summaryDe"),
    abs1LabelTr: formData.get("abs1LabelTr"),
    abs1LabelDe: formData.get("abs1LabelDe"),
    abs1NoteTr: formData.get("abs1NoteTr"),
    abs1NoteDe: formData.get("abs1NoteDe"),
    abs2LabelTr: formData.get("abs2LabelTr"),
    abs2LabelDe: formData.get("abs2LabelDe"),
    abs2NoteTr: formData.get("abs2NoteTr"),
    abs2NoteDe: formData.get("abs2NoteDe"),
  });
  if (!parsed.success) return;
  await saveLegislation(admin.profileId, parsed.data);
  revalidatePath("/admin/bilgi");
  revalidatePath("/sartlar");
}

export async function saveFaqAction(formData: FormData) {
  const admin = await requirePanel();
  const id = String(formData.get("id") ?? "");
  const parsed = faqSchema.safeParse({
    locale: formData.get("locale"),
    question: formData.get("question"),
    answer: formData.get("answer"),
    published: formData.get("published") === "on",
    sourceNote: String(formData.get("sourceNote") ?? ""),
  });
  if (!parsed.success) return;
  if (id && !isUuid(id)) return;
  await saveFaq(admin.profileId, { ...parsed.data, id: id || undefined });
  revalidatePath("/admin/bilgi");
  revalidatePath("/sss");
}

export async function deleteFaqAction(formData: FormData) {
  const admin = await requirePanel();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;
  await deleteFaq(admin.profileId, id);
  revalidatePath("/admin/bilgi");
  revalidatePath("/sss");
}

export async function changePasswordAction(formData: FormData) {
  const admin = await requirePanel();
  const result = await changePassword(
    admin.profileId,
    String(formData.get("currentPassword") ?? ""),
    String(formData.get("nextPassword") ?? ""),
  );
  return { ok: result === "ok", code: result };
}

export async function rotateRecoveryAction(formData: FormData) {
  const admin = await requirePanel();
  const codes = await rotateRecoveryCodes(admin.profileId, String(formData.get("currentPassword") ?? ""));
  if (!codes) return { ok: false as const };
  return { ok: true as const, codes };
}
