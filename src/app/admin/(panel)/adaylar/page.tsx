import Link from "next/link";
import { createManualLeadAction } from "@/server/actions/crm";
import { LEAD_STATUSES, SCENARIO_HINTS, SCENARIO_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import { TRACKER_LABEL, TRACKER_STAGES } from "@/lib/domain/tracker";
import { formatDateTime } from "@/lib/format";
import { listLeads } from "@/server/leads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const instant = false;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function LeadsPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const q = one(params.q);
  const status = one(params.status);
  const scenario = one(params.scenario);
  const ce = one(params.ce);
  const src3 = one(params.src3);
  const german = one(params.german);
  const family = one(params.family);
  const source = one(params.source);
  const waiting = one(params.waiting);
  const tracker = one(params.tracker);
  const leads = await listLeads({
    q: q || undefined,
    status: status || undefined,
    scenario: scenario || undefined,
    ce: ce || undefined,
    src3: src3 || undefined,
    german: german || undefined,
    family: family || undefined,
    source: source || undefined,
    waiting: waiting || undefined,
    tracker: tracker || undefined,
  });
  return (
    <main className="mx-auto max-w-6xl">
      <h1 className="font-serif text-4xl">Adaylar</h1>
      <p className="mt-2 text-sm text-muted-foreground">{leads.length} kayıt listeleniyor. Silinmiş kayıtlar görünmez.</p>
      <div className="mt-4 flex gap-2 overflow-x-auto text-sm">
        {[["", "Tümü"], ["received", "Yeni"], ["reviewing", "İncelenen"], ["started", "Süreç başladı"], ["completed", "Tamamlanan"], ["closed", "Kapatılan"]].map(([value, label]) => (
          <Link key={label} href={value ? `/admin/adaylar?tracker=${value}` : "/admin/adaylar"} className={`rounded-full border px-3 py-1 whitespace-nowrap ${tracker === value ? "border-accent text-accent" : "border-border"}`}>{label}</Link>
        ))}
      </div>
      <form className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4" action="/admin/adaylar">
        <Input name="q" defaultValue={q} placeholder="Ad, e-posta veya dosya no" className="h-10" />
        <select name="status" defaultValue={status} className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="">Tüm durumlar</option>
          {LEAD_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABEL[item]}</option>)}
        </select>
        <select name="scenario" defaultValue={scenario} className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="">Tüm izler</option>
          {SCENARIO_HINTS.map((item) => <option key={item} value={item}>{SCENARIO_LABEL[item]}</option>)}
        </select>
        <Button type="submit" className="h-10">Filtrele</Button>
        <select name="ce" defaultValue={ce} className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="">CE</option>
          <option value="have">CE var</option>
          <option value="planning">CE planı</option>
        </select>
        <select name="src3" defaultValue={src3} className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="">SRC3</option>
          <option value="have">SRC3 var</option>
          <option value="planning">SRC3 planı</option>
          <option value="info">SRC3 bilgi</option>
        </select>
        <select name="family" defaultValue={family} className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="">Aile</option>
          <option value="alone">Tek</option>
          <option value="spouse">Eş</option>
          <option value="family">Aile</option>
        </select>
        <select name="source" defaultValue={source} className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="">Kaynak</option>
          <option value="website_assessment">Site</option>
          <option value="whatsapp">Eski kanal</option>
          <option value="telegram">Telegram</option>
          <option value="manual">Elle</option>
        </select>
        <select name="german" defaultValue={german} className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="">Almanca</option>
          <option value="none">Yok</option>
          <option value="A1">A1</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
        </select>
        <select name="waiting" defaultValue={waiting} className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="">Bekleyen</option>
          <option value="human">İnsan desteği</option>
          <option value="consultation">Görüşme</option>
        </select>
      </form>
      <details className="mt-4 rounded-2xl border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">Elle aday ekle</summary>
        <form action={createManualLeadAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <Input name="fullName" required minLength={3} placeholder="Ad soyad" className="h-10" />
          <Input name="email" type="email" placeholder="E-posta (isteğe bağlı)" className="h-10" />
          <Input name="country" placeholder="Ülke" className="h-10" />
          <select name="contactPreference" defaultValue="unspecified" className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
            <option value="unspecified">İletişim tercihi yok</option>
            <option value="email">E-posta</option>
            <option value="telegram">Telegram</option>
            <option value="instagram">Instagram</option>
            <option value="phone">Telefon</option>
          </select>
          <Input name="notes" placeholder="İç not" className="h-10 md:col-span-2" />
          <Button type="submit" className="h-10 md:col-span-2">Kaydet</Button>
        </form>
      </details>
      {leads.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-6 text-sm">Bu filtrede aday yok.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Dosya</th>
                <th className="px-3 py-2 font-medium">Aday</th>
                <th className="px-3 py-2 font-medium">Durum</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">İz</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-border">
                  <td className="px-3 py-3 font-mono text-xs">
                    <Link href={`/admin/adaylar/${lead.id}`} className="text-accent">{lead.publicCode}</Link>
                  </td>
                  <td className="px-3 py-3">
                    <p>{lead.fullName}</p>
                    <p className="text-xs text-muted-foreground">{lead.email || "E-posta yok"}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="secondary">{TRACKER_STAGES.includes(lead.trackerStage as typeof TRACKER_STAGES[number]) ? TRACKER_LABEL[lead.trackerStage as typeof TRACKER_STAGES[number]] : lead.trackerStage}</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{STATUS_LABEL[lead.status]}</p>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">{lead.scenarioHint ? SCENARIO_LABEL[lead.scenarioHint] : "—"}</td>
                  <td className="hidden px-3 py-3 lg:table-cell">{formatDateTime(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
