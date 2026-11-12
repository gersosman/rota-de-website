export const instant = false;

export function POST() {
  return Response.json({ ok: false, error: "telegram_disabled" }, { status: 410 });
}
