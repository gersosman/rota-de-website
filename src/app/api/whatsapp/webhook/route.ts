import { parseWhatsappBody } from "@/lib/whatsapp/parse";
import { allowRate, clientIp, hashValue } from "@/server/rate-limit";
import { applyWhatsappEvents } from "@/server/whatsapp/inbox";
import { whatsappCredentials, whatsappSignatureOk, whatsappVerifyOk } from "@/server/whatsapp/api";

export const instant = false;

function ipBucket(request: Request) {
  return `whatsapp-hook:${hashValue(clientIp(new Headers(request.headers)))}`;
}

export async function GET(request: Request) {
  if (!whatsappCredentials()) return new Response("whatsapp_not_configured", { status: 503 });
  if (!(await allowRate(ipBucket(request), 30, 60))) return new Response("rate", { status: 429 });
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge");
  if (!whatsappVerifyOk(url.searchParams.get("hub.mode"), url.searchParams.get("hub.verify_token"))) {
    return new Response("forbidden", { status: 403 });
  }
  if (!challenge || !/^[A-Za-z0-9]{1,128}$/.test(challenge)) return new Response("bad_challenge", { status: 400 });
  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(request: Request) {
  if (!whatsappCredentials()) return Response.json({ ok: false, error: "whatsapp_not_configured" }, { status: 503 });
  if (!(await allowRate(ipBucket(request), 120, 60))) return Response.json({ ok: false, error: "rate" }, { status: 429 });
  const raw = await request.text();
  if (!whatsappSignatureOk(raw, request.headers.get("x-hub-signature-256"))) {
    return Response.json({ ok: false, error: "signature" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "json" }, { status: 400 });
  }
  try {
    await applyWhatsappEvents(parseWhatsappBody(payload), true);
  } catch (error) {
    console.error("whatsapp_webhook_failed", error instanceof Error ? error.name : "error");
    return Response.json({ ok: false, error: "retry" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
