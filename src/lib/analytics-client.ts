"use client";

const NAMES = [
  "home_view",
  "assessment_start",
  "ce_choice",
  "src3_choice",
  "german_choice",
  "family_choice",
  "form_complete",
  "form_abandon",
  "telegram_click",
] as const;

export type TrackName = (typeof NAMES)[number];

function sessionKey() {
  const existing = sessionStorage.getItem("rota-anon");
  if (existing && /^[0-9a-f-]{16,80}$/i.test(existing)) return existing;
  const next = crypto.randomUUID();
  sessionStorage.setItem("rota-anon", next);
  return next;
}

export function track(name: TrackName, step?: string) {
  if (!NAMES.includes(name)) return;
  try {
    const body = JSON.stringify({ name, session: sessionKey(), step });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* Measurement never blocks the form. */
  }
}
