import "server-only";

export type MailResult = "sent" | "skipped" | "failed" | "no-email";

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

export function contactInbox(): string | null {
  const value = process.env.CONTACT_NOTIFY_EMAIL?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 180) return null;
  return value;
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

export async function sendStaffNotice(input: { to: string | null; subject: string; text: string }): Promise<MailResult> {
  if (!input.to) return "no-email";
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!key || !from) return "skipped";
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
    return response.ok ? "sent" : "failed";
  } catch (error) {
    console.error("mail_failed", error instanceof Error ? error.name : "error");
    return "failed";
  }
}
