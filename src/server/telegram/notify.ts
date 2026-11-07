import "server-only";

import { telegramCall, telegramCredentials } from "@/server/telegram/api";

export async function notifyAdmin(text: string): Promise<"sent" | "skipped" | "failed"> {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() ?? "";
  if (!/^-?\d{1,20}$/.test(chatId) || !telegramCredentials()) return "skipped";
  const result = await telegramCall("sendMessage", { chat_id: chatId, text: text.slice(0, 700) });
  return result.ok ? "sent" : "failed";
}
