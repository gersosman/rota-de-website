"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/format";
import { requirePanel } from "@/server/auth";
import { mergeLeads } from "@/server/leads";
import { sendStaffReply } from "@/server/telegram/inbox";
import {
  refreshWhatsappConnection,
  runWhatsappTurn,
  sendWhatsappStaffReply,
  setWhatsappPaused,
} from "@/server/whatsapp/inbox";

function back(notice: string, conversation = ""): never {
  const query = new URLSearchParams({ notice: notice.slice(0, 180) });
  if (conversation) query.set("id", conversation);
  redirect(`/admin/mesajlar?${query.toString()}`);
}

export async function checkWhatsappAction() {
  const admin = await requirePanel();
  const result = await refreshWhatsappConnection(admin.profileId);
  back(result.detail);
}

export async function deskWhatsappAction(formData: FormData) {
  await requirePanel();
  const button = String(formData.get("button") ?? "").trim();
  const text = String(formData.get("text") ?? "");
  await runWhatsappTurn({ chatKey: "wa:desk", text: button ? "" : text, button: button || null, live: false });
  back("Yerel deneme kaydedildi. WhatsApp'a gitmedi.");
}

export async function replyMessageAction(formData: FormData) {
  const admin = await requirePanel();
  const channel = String(formData.get("channel") ?? "");
  const text = String(formData.get("text") ?? "");
  if (channel === "telegram") {
    const chat = String(formData.get("chat") ?? "");
    const result = await sendStaffReply(admin.profileId, chat, text);
    back(result.detail);
  }
  const id = String(formData.get("conversation") ?? "");
  if (!isUuid(id)) back("Sohbet bulunamadı.");
  const result = await sendWhatsappStaffReply(admin.profileId, id, text);
  back(result.detail, id);
}

export async function pauseWhatsappAction(formData: FormData) {
  const admin = await requirePanel();
  const id = String(formData.get("conversation") ?? "");
  if (!isUuid(id)) back("Sohbet bulunamadı.");
  const paused = formData.get("paused") === "true";
  await setWhatsappPaused(admin.profileId, id, paused);
  back(paused ? "Otomatik cevap durdu." : "Otomatik cevap açık.", id);
}

export async function mergeLeadAction(formData: FormData) {
  const admin = await requirePanel();
  const source = String(formData.get("source") ?? "");
  const target = String(formData.get("target") ?? "").trim().toUpperCase();
  const result = await mergeLeads(admin.profileId, source, target);
  revalidatePath("/admin/adaylar");
  redirect(`/admin/adaylar/${source}?notice=${encodeURIComponent(result.detail)}`);
}
