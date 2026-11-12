import Link from "next/link";
import { AUTOMATION_LABEL } from "@/lib/domain/labels";
import { formatDateTime, formatMoney, num } from "@/lib/format";
import { dashboardData } from "@/server/leads";
import { funnelCounts } from "@/server/analytics";
import { outcomeCounts } from "@/server/operations";

export const instant = false;

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border py-3 last:border-0">
      <div>
        <p className="text-sm">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <p className="text-right text-sm font-medium">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const [data, funnel, outcomes] = await Promise.all([dashboardData(), funnelCounts(), outcomeCounts()]);
  const counts = data.counts;
  const sales = data.sales;
  const instagram = data.integrations.find((item) => item.provider === "instagram");
  const instagramConnected = instagram?.status === "connected";
  return (
    <main className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Genel bakış</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sayılar veritabanındaki kayıtlardır. Bağlı olmayan kanallar için performans uydurulmaz.</p>
        </div>
        <Link href="/admin/adaylar" className="text-sm text-accent">Adaylara git</Link>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card px-4">
          <h2 className="pt-4 font-medium">Adaylar</h2>
          <Row label="Toplam" value={String(num(counts?.total_leads))} />
          <Row label="Bugün" value={String(num(counts?.today_leads))} hint="Avrupa/Berlin günü" />
          <Row label="Görüşme bekleyen" value={String(num(counts?.consultations))} />
          <Row label="Aktif müşteri" value={String(num(counts?.active_customers))} />
        </section>
        <section className="rounded-2xl border border-border bg-card px-4">
          <h2 className="pt-4 font-medium">Ödemeler</h2>
          <Row
            label="Doğrulanmış satış"
            value={`${num(sales?.sales_count)} kayıt · ${formatMoney(num(sales?.sales_cents))}`}
            hint="Yalnızca sağlayıcı webhook'u ile doğrulanmış ödemeler"
          />
          <Row label="Sağlayıcıda bekleyen ödeme" value={String(num(sales?.pending_payments))} />
          <Row label="Ödeme bekleyen aday" value={String(num(counts?.payment_pending_leads))} />
          <Row label="Yaklaşan randevu" value={String(data.upcoming)} hint="Önümüzdeki 7 gün, onaylı veya talep" />
        </section>
        <section className="rounded-2xl border border-border bg-card px-4">
          <h2 className="pt-4 font-medium">Kanallar</h2>
          <Row
            label="Instagram"
            value={instagramConnected ? "Bağlı" : "Bağlı değil"}
            hint={instagramConnected ? "Hesap kaydı bağlı görünüyor." : "Takipçi ve içerik performansı yok. Sahte metrik gösterilmez."}
          />
          <Row
            label="Telegram"
            value="Devre dışı"
            hint="Yeni başvuru ve bildirim bu kanaldan açılmaz. Eski kayıtlar durur."
          />
          <Row label="Başvuru" value={String(outcomes.applications)} hint="Silinmemiş ve birleştirilmemiş web ve elle açılan dosyalar" />
          <Row label="Ön değerlendirme" value={String(outcomes.precheck)} hint="Değerlendirme kaydı olan dosyalar" />
          <Row label="Görüşme aşaması" value={String(outcomes.interview)} hint="Yalnız pipeline_stage = interview" />
          <Row label="Sözleşme" value={String(outcomes.contract)} hint="Vize onayı bu sayıya girmez" />
          <Row label="İşe başladı" value={String(outcomes.started)} hint="Başvuru bu sayıya girmez" />
        </section>
        <section className="rounded-2xl border border-border bg-card px-4">
          <h2 className="pt-4 font-medium">Dönüşüm</h2>
          {funnel.visits === 0 ? <p className="py-4 text-sm text-muted-foreground">Henüz ölçüm yok.</p> : (
            <>
              <Row label="Ana sayfa ziyareti" value={String(funnel.visits)} hint="Anonim oturum" />
              <Row label="Ön değerlendirme başladı" value={String(funnel.started)} />
              <Row label="Başvuru tamamlandı" value={String(funnel.completed)} />
            </>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-card px-4">
          <h2 className="pt-4 font-medium">Otomasyon</h2>
          <Row label="Başarısız görev" value={String(data.failures.length)} hint="Kuyrukta failed durumundaki son kayıtlar" />
          {data.automations.filter((item) => item.kind !== "whatsapp_welcome").slice(0, 4).map((item) => (
            <Row key={item.kind} label={AUTOMATION_LABEL[item.kind] ?? item.kind} value={item.enabled ? "Açık tercih" : "Kapalı"} hint="Çalıştırıcı bu fazda bağlı değil." />
          ))}
        </section>
      </div>
      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Son kayıtlar</h2>
        {data.activity.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Henüz denetim kaydı yok.</p> : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.activity.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-2">
                <span>{item.action}</span>
                <span className="text-muted-foreground">{formatDateTime(item.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
        {data.failures.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-sm font-medium">Başarısız görevler</h3>
            <ul className="mt-2 text-sm text-destructive">
              {data.failures.map((job) => (
                <li key={job.id}>{job.kind}: {job.last_error || "Hata açıklaması yok"}</li>
              ))}
            </ul>
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">Başarısız otomasyon görevi yok.</p>}
      </section>
    </main>
  );
}
