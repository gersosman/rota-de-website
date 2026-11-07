import { secretEquals } from "@/lib/security/hmac";
import { allowRate, clientIp, hashValue } from "@/server/rate-limit";
import { telegramCredentials } from "@/server/telegram/api";
import { claimUpdate, parseTelegramUpdate, releaseUpdate, runChatTurn } from "@/server/telegram/inbox";

export const instant = false;

export async function POST(request: Request) {
  const credentials = telegramCredentials();
  if (!credentials) {
    return Response.json({ ok: false, error: "telegram_not_configured" }, { status: 503 });
  }
  const headerStore = new Headers(request.headers);
  if (!secretEquals(credentials.secret, headerStore.get("x-telegram-bot-api-secret-token"))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const allowed = await allowRate(`telegram-hook:${hashValue(clientIp(headerStore))}`, 120, 60);
  if (!allowed) return Response.json({ ok: false, error: "rate" }, { status: 429 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const update = parseTelegramUpdate(payload);
  if (!update) return Response.json({ ok: true, ignored: true });
  const fresh = await claimUpdate(update.updateId);
  if (!fresh) return Response.json({ ok: true, duplicate: true });
  try {
    const result = await runChatTurn({
      chatKey: `tg:${update.chatId}`,
      chatId: update.chatId,
      text: update.text,
      callback: update.callback,
      media: update.media,
      handle: update.handle,
      userId: update.userId,
      delivery: "telegram",
      callbackId: update.callbackId,
    });
    if (!result.ok) {
      await releaseUpdate(update.updateId);
      return Response.json({ ok: false, error: result.reason }, { status: 429 });
    }
  } catch {
    await releaseUpdate(update.updateId);
    return Response.json({ ok: false, error: "retry" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
