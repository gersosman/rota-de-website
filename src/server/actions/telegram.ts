"use server";

import { redirect } from "next/navigation";
import { requirePanel } from "@/server/auth";
import {
  refreshTelegramConnection,
  resetDeskChat,
  runChatTurn,
  sendStaffReply,
  setTelegramWelcome,
} from "@/server/telegram/inbox";

function go(chat: string, notice: string): never {
  const safeChat = /^(tg:-?\d{1,20}|desk:local)$/.test(chat) ? chat : "desk:local";
  redirect(`/admin/telegram?chat=${encodeURIComponent(safeChat)}&notice=${encodeURIComponent(notice.slice(0, 180))}`);
}

export async function checkTelegramAction() {
  const admin = await requirePanel();
  const result = await refreshTelegramConnection(admin.profileId);
  go("desk:local", result.detail);
}

export async function welcomeTelegramAction(formData: FormData) {
  const admin = await requirePanel();
  await setTelegramWelcome(admin.profileId, formData.get("enabled") === "true");
  go("desk:local", formData.get("enabled") === "true" ? "Karşılama açık." : "Karşılama kapalı.");
}

export async function deskTurnAction(formData: FormData) {
  await requirePanel();
  const callback = String(formData.get("callback") ?? "").trim();
  const text = String(formData.get("text") ?? "");
  await runChatTurn({
    chatKey: "desk:local",
    chatId: null,
    text: callback ? "" : text,
    callback: callback || null,
    media: false,
    handle: null,
    delivery: "desk",
  });
  go("desk:local", "Yerel deneme kaydedildi. Telegram'a gitmedi.");
}

export async function resetDeskAction() {
  await requirePanel();
  await resetDeskChat();
  go("desk:local", "Yerel deneme sıfırlandı.");
}

export async function staffReplyAction(formData: FormData) {
  const admin = await requirePanel();
  const chat = String(formData.get("chat") ?? "");
  const result = await sendStaffReply(admin.profileId, chat, String(formData.get("text") ?? ""));
  go(chat, result.detail);
}

export async function inboxReplyAction(formData: FormData) {
  const admin = await requirePanel();
  const chat = String(formData.get("chat") ?? "");
  const result = await sendStaffReply(admin.profileId, chat, String(formData.get("text") ?? ""));
  const safe = /^(tg:-?\d{1,20}|desk:local)$/.test(chat) ? chat : "";
  redirect(`/admin/mesajlar?notice=${encodeURIComponent(result.detail.slice(0, 180))}${safe ? `&chat=${encodeURIComponent(safe)}` : ""}`);
}
