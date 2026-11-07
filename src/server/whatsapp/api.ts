import "server-only";

import { verifyHmacSha256, secretEquals } from "@/lib/security/hmac";

export type WhatsappCredentials = {
  token: string;
  phoneNumberId: string;
  businessId: string;
  verifyToken: string;
  appSecret: string;
  version: string;
};

const VERSION = /^v\d{2}\.\d$/;

export function whatsappCredentials(): WhatsappCredentials | null {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const businessId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() ?? "";
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim() ?? "";
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() ?? "";
  const requested = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
  if (token.length < 20 || /\s/.test(token)) return null;
  if (!/^\d{6,20}$/.test(phoneNumberId) || !/^\d{6,20}$/.test(businessId)) return null;
  if (verifyToken.length < 8 || verifyToken.length > 128 || /\s/.test(verifyToken)) return null;
  if (appSecret.length < 16 || appSecret.length > 256 || /\s/.test(appSecret)) return null;
  if (!VERSION.test(requested)) return null;
  return { token, phoneNumberId, businessId, verifyToken, appSecret, version: requested };
}

export function whatsappSignatureOk(raw: string, header: string | null): boolean {
  const credentials = whatsappCredentials();
  if (!credentials) return false;
  return verifyHmacSha256(credentials.appSecret, raw, header);
}

export function whatsappVerifyOk(mode: string | null, token: string | null): boolean {
  const credentials = whatsappCredentials();
  if (!credentials || mode !== "subscribe") return false;
  return secretEquals(credentials.verifyToken, token);
}

type CallResult =
  | { ok: true; result: Record<string, unknown>; statusCode: number }
  | { ok: false; description: string; statusCode: number };

export async function whatsappCall(path: string, init?: { method?: string; body?: Record<string, unknown> }): Promise<CallResult> {
  const credentials = whatsappCredentials();
  if (!credentials) return { ok: false, description: "Kurulum bekleniyor.", statusCode: 0 };
  if (!path.startsWith("/") || path.includes("..")) return { ok: false, description: "İstek reddedildi.", statusCode: 0 };
  try {
    const response = await fetch(`https://graph.facebook.com/${credentials.version}${path}`, {
      method: init?.method ?? "POST",
      headers: {
        authorization: `Bearer ${credentials.token}`,
        "content-type": "application/json",
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      display_phone_number?: string;
      messages?: Array<{ id?: string }>;
    };
    if (!response.ok) {
      return { ok: false, description: (payload.error?.message || "Bağlantı hatası.").slice(0, 180), statusCode: response.status };
    }
    return { ok: true, result: payload as Record<string, unknown>, statusCode: response.status };
  } catch {
    return { ok: false, description: "WhatsApp servisine ulaşılamadı.", statusCode: 0 };
  }
}

export function displayDigits(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}
