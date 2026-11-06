import { AUTOMATION_LABEL } from "@/lib/domain/labels";
import { formatDateTime } from "@/lib/format";
import { sql } from "@/server/db";
import { integrationRows } from "@/server/knowledge";

export const instant = false;

const providerLabel: Record<string, string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  email: "E-posta",
  payment: "Ödeme",
};

export default async function IntegrationsPage() {
  const [accounts, automations] = await Promise.all([
    integrationRows(),
    sql<{ kind: string; enabled: boolean; updated_at: string }>(
      "select kind, enabled, updated_at from automation_settings order by kind",
    ),
  ]);
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">Entegrasyonlar</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Bağlantı kurulmadı. Bu ekran başarılı bağlantı göstermez. Anahtar değerleri veritabanında ve tarayıcıda tutulmaz;
        yalnızca ortam değişkeninin adı kayıtlıdır.
      </p>
      <ul className="mt-6 space-y-3">
        {accounts.map((account) => (
          <li key={account.provider} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{providerLabel[account.provider] ?? account.provider}</h2>
              <span className="rounded-full bg-muted px-2 py-1 text-xs">
                {account.status === "connected" ? "Bağlı" : account.status === "mock" ? "MOCK" : "Bağlı değil"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{account.last_error}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ortam adı: {account.secret_ref || "—"} · {formatDateTime(account.updated_at)}</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-medium">Otomasyon tercihleri</h2>
      <p className="mt-1 text-sm text-muted-foreground">Anahtarlar kapalı durur. Çalıştırıcı bağlı olmadığı için görev üretilmez.</p>
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
