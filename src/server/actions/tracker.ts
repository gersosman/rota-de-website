"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publicGate } from "@/server/actions/guards";
import { requirePanel } from "@/server/auth";
import { lookupPublic, saveTrackerCopy, setTrackerStage } from "@/server/tracker";
import { isTrackerStage } from "@/lib/domain/tracker";
import { trackLookupSchema } from "@/lib/validation/assessment";

export async function lookupApplicationAction(input: unknown) {
  const gate = await publicGate("track", 12, 60 * 60);
  if (!gate.ok) return { ok: false as const, code: gate.code };
  const parsed = trackLookupSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid" as const };
  if (parsed.data.companyWebsite) return { ok: false as const, code: "invalid" as const };
  try {
    const result = await lookupPublic(parsed.data.code, parsed.data.verifier);
    if (!result) return { ok: false as const, code: "invalid" as const };
    return { ok: true as const, result };
  } catch (error) {
    console.error("track_lookup_failed", error instanceof Error ? error.name : "error");
    return { ok: false as const, code: "unavailable" as const };
  }
}

export async function trackerStageAction(formData: FormData) {
  const admin = await requirePanel();
  const leadId = String(formData.get("leadId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const message = String(formData.get("publicMessage") ?? "");
  const ok = await setTrackerStage(admin.profileId, leadId, stage, message);
  revalidatePath(`/admin/adaylar/${leadId}`);
  revalidatePath("/basvuru-takip");
  redirect(`/admin/adaylar/${leadId}?notice=${encodeURIComponent(ok ? "Adayın gördüğü durum güncellendi." : "Durum kaydedilemedi.")}`);
}

export async function trackerCopyAction(formData: FormData) {
  const admin = await requirePanel();
  const stage = String(formData.get("stage") ?? "");
  const body = String(formData.get("body") ?? "");
  if (!isTrackerStage(stage)) redirect("/admin/durumlar?notice=Kaydedilemedi");
  const ok = await saveTrackerCopy(admin.profileId, stage, body);
  revalidatePath("/admin/durumlar");
  redirect(`/admin/durumlar?notice=${encodeURIComponent(ok ? "Aday metni güncellendi." : "Metin kaydedilemedi.")}`);
}
