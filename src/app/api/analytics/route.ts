import { allowRate, clientIp, hashValue } from "@/server/rate-limit";
import { sql } from "@/server/db";

export const instant = false;

const NAMES = new Set([
  "home_view",
  "assessment_start",
  "ce_choice",
  "src3_choice",
  "german_choice",
  "family_choice",
  "form_complete",
  "form_abandon",
  "whatsapp_click",
  "telegram_click",
]);

export async function POST(request: Request) {
  const headerStore = new Headers(request.headers);
  if (!(await allowRate(`analytics:${hashValue(clientIp(headerStore))}`, 60, 60))) {
    return Response.json({ ok: false }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const name = typeof record?.name === "string" ? record.name : "";
  const session = typeof record?.session === "string" ? record.session : "";
  const step = typeof record?.step === "string" ? record.step.slice(0, 40) : null;
  if (!NAMES.has(name) || !/^[0-9a-f-]{16,80}$/i.test(session)) return Response.json({ ok: false }, { status: 400 });
  await sql(
    "insert into analytics_events (name, session_key, step) values ($1, $2, $3)",
    [name, hashValue(session), step],
  );
  return Response.json({ ok: true });
}
