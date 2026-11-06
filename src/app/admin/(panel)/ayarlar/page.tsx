import { rejectDeletionAction } from "@/server/actions/crm";
import { purgeRetentionAction, saveCompanyAction, saveRetentionAction } from "@/server/actions/settings";
import { SecurityForms } from "@/components/admin/security-forms";
import { formatDateTime } from "@/lib/format";
import { companyReady } from "@/lib/validation/assessment";
import { describeDataStore, getCompany, getRetention } from "@/server/knowledge";
import { listDeletionRequests } from "@/server/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const instant = false;

const fields = [
  ["legalName", "İşletme unvanı"],
  ["legalForm", "Hukuki şekil"],
  ["addressLine", "Adres"],
  ["postalCode", "Posta kodu"],
  ["city", "Şehir"],
  ["country", "Ülke"],
  ["email", "E-posta"],
  ["phone", "Telefon"],
  ["registerCourt", "Sicil mahkemesi"],
  ["registerNumber", "Sicil numarası"],
  ["vatId", "KDV kimliği"],
  ["responsiblePerson", "Sorumlu kişi"],
] as const;

export default async function SettingsPage() {
  const [company, retention, requests] = await Promise.all([getCompany(), getRetention(), listDeletionRequests()]);
  const store = describeDataStore();
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">Ayarlar</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Veri deposu: {store === "postgres" ? "DATABASE_URL üzerinden Postgres. Adres gösterilmez." : "Yerel PGlite. Supabase bağlandığında aynı şema kullanılır. Sahte bağlantı yok."}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        İşletme bilgisi: {companyReady(company) ? "alanlar dolu, hukuk incelemesi hâlâ gerekli." : "eksik."}
      </p>
      <form action={saveCompanyAction} className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">İşletme</h2>
        {fields.map(([name, label]) => (
          <label key={name} className="grid gap-1 text-sm">
            {label}
            <Input name={name} defaultValue={company[name]} className="h-10" />
          </label>
        ))}
        <Button type="submit" className="h-10">Kaydet</Button>
      </form>
      <form action={saveRetentionAction} className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Saklama</h2>
        <p className="text-xs text-muted-foreground">{retention.note}</p>
        <label className="grid gap-1 text-sm">Kapanmış aday gün sayısı
          <Input name="leadDays" type="number" min={30} max={3650} defaultValue={retention.leadDays} className="h-10" />
        </label>
        <label className="grid gap-1 text-sm">Denetim gün sayısı
          <Input name="auditDays" type="number" min={30} max={3650} defaultValue={retention.auditDays} className="h-10" />
        </label>
        <Button type="submit" variant="outline" className="h-10">Süreleri kaydet</Button>
      </form>
      <form action={purgeRetentionAction} className="mt-3">
        <Button type="submit" variant="outline" className="h-10">Süresi dolan kayıtları anonimleştir</Button>
      </form>
      <div className="mt-8">
        <SecurityForms />
      </div>
      <section className="mt-8">
        <h2 className="font-medium">Silme talepleri</h2>
        {requests.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Talep yok.</p> : (
          <ul className="mt-3 space-y-3">
            {requests.map((item) => {
              const row = item as { id: string; email: string; status: string; requested_at: string };
              return (
                <li key={row.id} className="rounded-xl border border-border p-3 text-sm">
                  <p>{row.email}</p>
                  <p className="text-xs text-muted-foreground">{row.status} · {formatDateTime(row.requested_at)}</p>
                  {row.status === "pending" ? (
                    <form action={rejectDeletionAction} className="mt-2">
                      <input type="hidden" name="requestId" value={row.id} />
                      <Button type="submit" size="sm" variant="outline">Eşleşme yok, kapat</Button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
