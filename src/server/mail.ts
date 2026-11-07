import "server-only";

export type MailResult = "sent" | "skipped" | "failed" | "no-email";

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
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
          "Durumu sitedeki Başvuru Takip bölümünden, bu e-posta veya başvuruda yazdığınız telefonla birlikte kontrol edebilirsiniz.",
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
