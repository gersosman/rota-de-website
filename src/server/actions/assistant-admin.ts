"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePanel } from "@/server/auth";
import { audit } from "@/server/audit";
import { saveAssistantSettings, saveKnowledge } from "@/server/assistant";
import { sql } from "@/server/db";

export async function assistantSettingsAction(formData: FormData) {
  const admin = await requirePanel();
  const enabled = formData.get("enabled") === "on";
  const daily = Number(formData.get("dailyLimit"));
  const dailyLimit = Number.isFinite(daily) ? Math.min(500, Math.max(5, Math.round(daily))) : 40;
  await saveAssistantSettings(enabled, dailyLimit);
  await audit({ actorId: admin.profileId, action: "assistant.settings", metadata: { enabled, dailyLimit } });
  revalidatePath("/admin/asistan");
  revalidatePath("/admin/entegrasyonlar");
  redirect("/admin/asistan?notice=Ayar%20kaydedildi");
}

export async function knowledgeAction(formData: FormData) {
  const admin = await requirePanel();
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim().slice(0, 300);
  const id = String(formData.get("id") ?? "").trim();
  if (title.length < 3 || body.length < 10) redirect("/admin/asistan?notice=Bilgi%20kaydedilemedi");
  await saveKnowledge({ id: id || undefined, title, body, sourceUrl, enabled: formData.get("enabled") === "on" });
  await audit({ actorId: admin.profileId, action: "assistant.knowledge", metadata: { title } });
  revalidatePath("/admin/asistan");
  redirect("/admin/asistan?notice=Bilgi%20kaydedildi");
}

export async function readNotificationsAction() {
  await requirePanel();
  await sql("update notifications set read_at = now() where read_at is null");
  revalidatePath("/admin/bildirimler");
  redirect("/admin/bildirimler");
}
