import "server-only";

import { inspectInbox, resendStatusCode, type InboxCheck } from "@/lib/contact-mail";

export type MailResult = "sent" | "skipped" | "failed" | "no-email";

export type StaffNoticeResult = {
  attempted: boolean;
  status: "sent" | "failed";
  errorCode: "ok" | "not_configured" | "no_email" | "resend_4xx" | "resend_5xx" | "resend_network";
};

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

export function contactInboxDiagnostics(): InboxCheck {
  return inspectInbox(process.env.CONTACT_NOTIFY_EMAIL);
}

export function contactInbox(): string | null {
  const value = process.env.CONTACT_NOTIFY_EMAIL;
  if (!inspectInbox(value).accepted || typeof value !== "string") return null;
  return value.trim();
}

export async function sendApplicationCode(to: string | null, code: string): Promise<MailResult> {
  if (!to) return "no-email";
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!key || !from) return "skipped";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: "ROTA DE başvuru numaranız",
        text: [
          "Başvurunuz ROTA DE sistemine kaydedildi.",
          "",
          `Başvuru numaranız: ${code}`,
          "",
          "Durumu sitedeki Başvuru Takip bölümünden, başvuru numaranız ve bu e-posta adresiyle kontrol edebilirsiniz.",
          "Bu mesaj iş veya vize garantisi değildir.",
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok ? "sent" : "failed";
  } catch (error) {
    console.error("mail_failed", error instanceof Error ? error.name : "error");
    return "failed";
  }
}

export async function sendStaffNotice(input: { to: string | null; subject: string; text: string }): Promise<StaffNoticeResult> {
  if (!input.to) return { attempted: false, status: "failed", errorCode: "no_email" };
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!key || !from) return { attempted: false, status: "failed", errorCode: "not_configured" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject.slice(0, 160),
        text: input.text.slice(0, 4000),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) return { attempted: true, status: "sent", errorCode: "ok" };
    return { attempted: true, status: "failed", errorCode: resendStatusCode(response.status) };
  } catch (error) {
    console.error("mail_failed", error instanceof Error ? error.name : "error");
    return { attempted: true, status: "failed", errorCode: "resend_network" };
  }
}
