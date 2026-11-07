import Link from "next/link";
import { AUTOMATION_LABEL } from "@/lib/domain/labels";
import { formatDateTime } from "@/lib/format";
import { sql } from "@/server/db";
import { mailConfigured } from "@/server/mail";
import { assistantSettings } from "@/server/assistant";
import { integrationRows } from "@/server/knowledge";

export const instant = false;

const providerLabel: Record<string, string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  email: "E-posta",
  payment: "Ödeme",
  whatsapp: "Kaldırılan kanal",
};

export default async function IntegrationsPage() {
  const [accounts, automations, assistant] = await Promise.all([
    integrationRows(),
      sql<{ kind: string; enabled: boolean; updated_at: string }>(
      "select kind, enabled, updated_at from automation_settings order by kind",
    ),
    assistantSettings(),
  ]);
  const mail = mailConfigured();
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">Entegrasyonlar</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Anahtar değerleri veritabanında ve tarayıcıda tutulmaz. Telegram ancak token doğrulanıp webhook kurulunca bağlı görünür.
      </p>
      <p className="mt-3">
        <Link href="/admin/telegram" className="text-sm text-accent">Telegram masasını aç</Link>
        <Link href="/admin/mesajlar" className="ml-4 text-sm text-accent">Mesaj kutusu</Link>
      </p>
      <ul className="mt-6 space-y-3">
        <li className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium">Yapay zekâ</h2>
            <span className="rounded-full bg-muted px-2 py-1 text-xs">{assistant.configured && assistant.enabled ? "Anahtar tanımlı" : "Kurulum bekleniyor"}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">OPENAI_API_KEY sunucuda yoksa asistan cevap üretmez. Anahtar bu sayfada görünmez.</p>
          <Link href="/admin/asistan" className="mt-2 inline-block text-sm text-accent">Asistan ayarları</Link>
        </li>
        <li className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium">E-posta</h2>
            <span className="rounded-full bg-muted px-2 py-1 text-xs">{mail ? "Gönderim hazır" : "Kurulum bekleniyor"}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">RESEND_API_KEY ve MAIL_FROM birlikte yoksa başvuru numarası yalnız ekranda kalır. Kayıt silinmez.</p>
        </li>
        {accounts.filter((account) => account.provider !== "whatsapp").map((account) => (
          <li key={account.provider} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{providerLabel[account.provider] ?? account.provider}</h2>
              <span className="rounded-full bg-muted px-2 py-1 text-xs">
                {account.status === "connected" ? "Bağlı" : account.status === "error" ? "Bağlantı hatası" : account.status === "mock" ? "MOCK" : "Kurulum bekleniyor"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{account.last_error}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ortam adı: {account.secret_ref || "—"} · {formatDateTime(account.updated_at)}</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-medium">Otomasyon tercihleri</h2>
      <p className="mt-1 text-sm text-muted-foreground">Telegram karşılama anahtarı Telegram sayfasından açılır. Diğer işler bu fazda çalışmaz.</p>
      <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
        {automations.map((item) => (
          <li key={item.kind} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{AUTOMATION_LABEL[item.kind] ?? item.kind}</span>
            <span>{item.enabled ? "Açık" : "Kapalı"}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
