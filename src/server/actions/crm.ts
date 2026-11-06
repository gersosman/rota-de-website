"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLeadStatus } from "@/lib/domain/labels";
import { isUuid } from "@/lib/format";
import { manualLeadSchema } from "@/lib/validation/assessment";
import { requirePanel } from "@/server/auth";
import {
  addLeadNote,
  anonymizeLead,
  changeLeadStatus,
  createManualLead,
  rejectDeletion,
  setFollowUp,
} from "@/server/leads";

export async function createManualLeadAction(formData: FormData) {
  const admin = await requirePanel();
  const parsed = manualLeadSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email") ?? "",
    contactPreference: formData.get("contactPreference") || "unspecified",
    country: String(formData.get("country") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) return;
  const email = parsed.data.email?.trim();
  const created = await createManualLead({
    actorId: admin.profileId,
    fullName: parsed.data.fullName,
    email: email || undefined,
    contactPreference: parsed.data.contactPreference,
    country: parsed.data.country,
    notes: parsed.data.notes,
  });
  revalidatePath("/admin/adaylar");
  revalidatePath("/admin");
  redirect(`/admin/adaylar/${created.id}`);
}

export async function changeStatusAction(formData: FormData) {
  const admin = await requirePanel();
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!isUuid(leadId) || !isLeadStatus(status)) return;
  await changeLeadStatus({ actorId: admin.profileId, leadId, status, note });
  revalidatePath(`/admin/adaylar/${leadId}`);
  revalidatePath("/admin/adaylar");
  revalidatePath("/admin");
}

export async function addNoteAction(formData: FormData) {
  const admin = await requirePanel();
  const leadId = String(formData.get("leadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!isUuid(leadId) || body.length < 2 || body.length > 4000) return;
  await addLeadNote({
    actorId: admin.profileId,
    leadId,
    body,
    countsAsContact: formData.get("countsAsContact") === "on",
  });
  revalidatePath(`/admin/adaylar/${leadId}`);
}

export async function followUpAction(formData: FormData) {
  const admin = await requirePanel();
  const leadId = String(formData.get("leadId") ?? "");
  const raw = String(formData.get("followUpOn") ?? "").trim();
  if (!isUuid(leadId)) return;
  const followUpOn = raw === "" ? null : raw;
  if (followUpOn && !/^\d{4}-\d{2}-\d{2}$/.test(followUpOn)) return;
  await setFollowUp(admin.profileId, leadId, followUpOn);
  revalidatePath(`/admin/adaylar/${leadId}`);
}

export async function anonymizeLeadAction(formData: FormData) {
  const admin = await requirePanel();
  const leadId = String(formData.get("leadId") ?? "");
  if (String(formData.get("confirm") ?? "") !== "SIL") return;
  if (!isUuid(leadId)) return;
  await anonymizeLead(admin.profileId, leadId);
  revalidatePath(`/admin/adaylar/${leadId}`);
  revalidatePath("/admin/adaylar");
  revalidatePath("/admin");
}

export async function rejectDeletionAction(formData: FormData) {
  const admin = await requirePanel();
  const requestId = String(formData.get("requestId") ?? "");
  if (!isUuid(requestId)) return;
  await rejectDeletion(admin.profileId, requestId);
  revalidatePath("/admin/ayarlar");
}

export async function linkDeletionAction(formData: FormData) {
  const admin = await requirePanel();
  const requestId = String(formData.get("requestId") ?? "");
  const leadId = String(formData.get("leadId") ?? "");
  if (!isUuid(requestId) || !isUuid(leadId)) return;
  await anonymizeLead(admin.profileId, leadId);
  const { sql } = await import("@/server/db");
  await sql(
    "update deletion_requests set lead_id = $1, status = 'completed', completed_at = now() where id = $2",
    [leadId, requestId],
  );
  revalidatePath("/admin/ayarlar");
}
