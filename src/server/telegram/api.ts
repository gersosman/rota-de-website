import "server-only";

const METHODS = new Set(["getMe", "sendMessage", "answerCallbackQuery", "setWebhook"]);

export type TelegramCredentials = { token: string; secret: string };

export function telegramCredentials(): TelegramCredentials | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "";
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) return null;
  if (secret.length < 16 || secret.length > 256 || /\s/.test(secret)) return null;
  return { token, secret };
}

export function publicWebhookUrl(): string | null {
  const raw = process.env.APP_PUBLIC_URL?.trim() ?? "";
  if (!raw.startsWith("https://")) return null;
  try {
    const url = new URL(raw);
    if (url.username || url.password) return null;
    return `${url.origin}/api/telegram/webhook`;
  } catch {
    return null;
  }
}

export function contactPageUrl(): string | null {
  const raw = process.env.APP_PUBLIC_URL?.trim() ?? "";
  if (!raw.startsWith("https://")) return null;
  try {
    const url = new URL(raw);
    return `${url.origin}/iletisim`;
  } catch {
    return null;
  }
}

type TelegramResult = { ok: true; result: Record<string, unknown> } | { ok: false; description: string };

export async function telegramCall(method: string, body?: Record<string, unknown>): Promise<TelegramResult> {
  const credentials = telegramCredentials();
  if (!credentials || !METHODS.has(method)) return { ok: false, description: "telegram_not_configured" };
  try {
    const response = await fetch(`https://api.telegram.org/bot${credentials.token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(8000),
    });
    const payload = (await response.json()) as { ok?: boolean; result?: Record<string, unknown>; description?: string };
    if (!payload.ok) return { ok: false, description: (payload.description || "telegram_rejected").slice(0, 180) };
    return { ok: true, result: payload.result ?? {} };
  } catch {
    return { ok: false, description: "telegram_unreachable" };
  }
}
