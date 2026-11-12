import Link from "next/link";
import { notFound } from "next/navigation";
import { addNoteAction, anonymizeLeadAction, changeStatusAction, followUpAction, mergeLeadAction } from "@/server/actions/crm";
import { pipelineAction } from "@/server/actions/operations";
import { trackerStageAction } from "@/server/actions/tracker";
import { LEAD_STATUSES, SCENARIO_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import { PIPELINE_LABEL, PIPELINE_STAGES } from "@/lib/domain/pipeline";
import { TRACKER_DEFAULT, TRACKER_LABEL, TRACKER_STAGES } from "@/lib/domain/tracker";
import { requirePanel } from "@/server/auth";
import { openForReview } from "@/server/tracker";
import { formatDateTime, formatMoney, jsonObject, num } from "@/lib/format";
import { getLead, phoneSuggestions } from "@/server/leads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const instant = false;

export default async function LeadPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const admin = await requirePanel();
  await openForReview(admin.profileId, id);
  const lead = await getLead(id);
  if (!lead) notFound();
  const suggestions = await phoneSuggestions(lead.id, lead.phone);
  const facts = [
    ["İletişim kanalları", lead.contactChannels.length ? lead.contactChannels.join(", ") : lead.contactPreference],
    ["Telefon", lead.phone || "—"],
    ...(lead.telegramHandle ? [["Eski Telegram kullanıcı adı", lead.telegramHandle] as const] : []),
    ["Instagram", lead.instagramHandle || "—"],
    ["Ülke", lead.country || "—"],
    ["Yaş aralığı", lead.ageRange || "—"],
    ["Ehliyet", lead.licenceClasses.join(", ") || "—"],
    ["Ehliyet ülkesi", lead.licenceCountry || "—"],
    ["CE", lead.ceIntent === "have" || lead.licenceClasses.includes("CE") ? "Var" : lead.ceIntent === "planning" ? "Almayı planlıyor" : "Belirtilmedi"],
    ["AB/AEA", lead.euEeaLicence || "—"],
    ["Code 95", lead.code95Status || "—"],
    ["Tecrübe", lead.experienceRange || "—"],
    ["Almanca", lead.germanLevel || "—"],
    ["Niyet", lead.intent || "—"],
    ["Kaynak", lead.source],
    ["Şehir", lead.city || "—"],
    ["CE niyeti", lead.ceIntent || "—"],
    ["SRC3", lead.src3Status || "—"],
    ["Aile", lead.familyStatus || "—"],
    ["Eşin Almancası", lead.spouseGerman || "—"],
    ["Çocuk yaş aralığı", lead.childrenAges || "—"],
    ["Son iletişim", formatDateTime(lead.lastContactAt)],
    ["Takip", lead.followUpOn || "—"],
  ];
  return (
    <main className="mx-auto max-w-5xl">
      <Link href="/admin/adaylar" className="text-sm text-muted-foreground">Adaylar</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-accent">{lead.publicCode}</p>
          <h1 className="font-serif text-4xl">{lead.fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{lead.email || "E-posta yok"}</p>
        </div>
        <Badge>{STATUS_LABEL[lead.status]}</Badge>
      </div>
      {lead.scenarioHint ? (
        <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          {SCENARIO_LABEL[lead.scenarioHint]}. Bu bir hukuki karar değildir.
        </p>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">Dosya</h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
          {lead.notes ? <p className="mt-4 text-sm leading-6">{lead.notes}</p> : null}
          <p className="mt-4 text-sm text-muted-foreground">Belge yükleme kapalı. Gerekli belgeler e-posta ile istenir.</p>
          {suggestions.length > 0 ? (
            <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
              <p>Aynı telefonla başka dosya var. Otomatik birleştirilmedi.</p>
              <ul className="mt-2">
                {suggestions.map((item) => <li key={item.id}>{item.public_code} · {item.full_name}</li>)}
              </ul>
            </div>
          ) : null}
          <form action={mergeLeadAction} className="mt-4 grid gap-2">
            <input type="hidden" name="source" value={lead.id} />
            <Input name="target" placeholder="Birleştirilecek dosya no" className="h-10" />
            <Button type="submit" variant="outline" className="h-10">Elle birleştir</Button>
          </form>
        </section>
        <section className="space-y-4">
          <form action={trackerStageAction} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-medium">Adayın gördüğü durum</h2>
            <p className="mt-1 text-xs text-muted-foreground">İlk açılışta “Başvuru Alındı” otomatik olarak “İnceleniyor” olur. İç notlar bu ekranda kalır.</p>
            <input type="hidden" name="leadId" value={lead.id} />
            <select name="stage" defaultValue={lead.trackerStage} className="mt-3 h-10 w-full rounded-lg border border-input bg-card px-2 text-sm">
              {TRACKER_STAGES.map((stage) => <option key={stage} value={stage}>{TRACKER_LABEL[stage]}</option>)}
            </select>
            <Input name="publicMessage" placeholder="Adayın göreceği açıklama" defaultValue={TRACKER_STAGES.includes(lead.trackerStage as typeof TRACKER_STAGES[number]) ? TRACKER_DEFAULT[lead.trackerStage as typeof TRACKER_STAGES[number]] : ""} className="mt-2 h-10" />
            <Button type="submit" className="mt-3 h-10">Takip durumunu kaydet</Button>
          </form>
          <form action={pipelineAction} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-medium">Süreç aşaması</h2>
            <input type="hidden" name="leadId" value={lead.id} />
            <select name="stage" defaultValue={lead.pipelineStage} className="mt-3 h-10 w-full rounded-lg border border-input bg-card px-2 text-sm">
              {PIPELINE_STAGES.map((stage) => <option key={stage} value={stage}>{PIPELINE_LABEL[stage]}</option>)}
            </select>
            <Input name="note" placeholder="Aşama notu" className="mt-2 h-10" />
            <p className="mt-2 text-xs text-muted-foreground">İş sözleşmesi ile vize onayı ayrı aşamalardır. Biri diğerinin yerine geçmez.</p>
            <Button type="submit" className="mt-3 h-10">Aşamayı kaydet</Button>
          </form>
          <form action={changeStatusAction} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-medium">Durum</h2>
            <input type="hidden" name="leadId" value={lead.id} />
            <select name="status" defaultValue={lead.status} className="mt-3 h-10 w-full rounded-lg border border-input bg-card px-2 text-sm">
              {LEAD_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
            </select>
            <Input name="note" placeholder="Durum notu" className="mt-2 h-10" />
            <p className="mt-2 text-xs text-muted-foreground">Ödendi işareti satış sayılmaz. Satış yalnızca doğrulanmış ödeme kaydından gelir.</p>
            <Button type="submit" className="mt-3 h-10">Durumu kaydet</Button>
          </form>
          <form action={followUpAction} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-medium">Takip tarihi</h2>
            <input type="hidden" name="leadId" value={lead.id} />
            <Input name="followUpOn" type="date" defaultValue={lead.followUpOn ?? ""} className="mt-3 h-10" />
            <Button type="submit" variant="outline" className="mt-3 h-10">Kaydet</Button>
          </form>
        </section>
      </div>
      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Ön değerlendirmeler</h2>
        {lead.assessments.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Değerlendirme yok.</p> : (
          <ul className="mt-3 space-y-4">
            {lead.assessments.map((item) => {
              const row = item as { id: string; classification: string; classification_reason: string; created_at: string; answers: unknown };
              const answers = jsonObject(row.answers);
              return (
                <li key={row.id} className="border-t border-border pt-4">
                  <p className="text-sm font-medium">{row.classification in SCENARIO_LABEL ? SCENARIO_LABEL[row.classification as keyof typeof SCENARIO_LABEL] : row.classification}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{row.classification_reason}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</p>
                  <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(answers, null, 2)}</pre>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">İç notlar</h2>
          <p className="mt-1 text-xs text-muted-foreground">Bu notlar adayın takip ekranında görünmez.</p>
          <form action={addNoteAction} className="mt-3 grid gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <Textarea name="body" required minLength={2} placeholder="İç not" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="countsAsContact" />
              Bu not müşteriyle iletişimi kaydeder
            </label>
            <Button type="submit" variant="outline" className="h-10">Not ekle</Button>
          </form>
          <ul className="mt-4 space-y-3">
            {lead.notesList.map((note) => {
              const row = note as { id: string; body: string; created_at: string; author: string | null; counts_as_contact: boolean };
              return (
                <li key={row.id} className="text-sm">
                  <p>{row.body}</p>
                  <p className="text-xs text-muted-foreground">{row.author || "Sistem"} · {formatDateTime(row.created_at)}{row.counts_as_contact ? " · iletişim" : ""}</p>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">Adayın gördüğü geçmiş</h2>
          <ol className="mt-3 space-y-3">
            {lead.trackerEvents.map((event) => {
              const row = event as { id: string; from_stage: string | null; to_stage: string; public_message: string; created_at: string; actor: string | null };
              const from = row.from_stage && TRACKER_STAGES.includes(row.from_stage as typeof TRACKER_STAGES[number]) ? TRACKER_LABEL[row.from_stage as typeof TRACKER_STAGES[number]] : row.from_stage;
              const to = TRACKER_STAGES.includes(row.to_stage as typeof TRACKER_STAGES[number]) ? TRACKER_LABEL[row.to_stage as typeof TRACKER_STAGES[number]] : row.to_stage;
              return (
                <li key={row.id} className="text-sm">
                  <p>{from ? `${from} → ` : ""}{to}</p>
                  <p className="text-muted-foreground">{row.public_message}</p>
                  <p className="text-xs text-muted-foreground">{row.actor || "Sistem"} · {formatDateTime(row.created_at)}</p>
                </li>
              );
            })}
          </ol>
          <h2 className="mt-6 font-medium">Durum geçmişi</h2>
          <ol className="mt-3 space-y-3">
            {lead.events.map((event) => {
              const row = event as { id: string; from_status: string | null; to_status: string; note: string | null; created_at: string };
              return (
                <li key={row.id} className="text-sm">
                  <p>{row.from_status ? `${STATUS_LABEL[row.from_status as keyof typeof STATUS_LABEL] ?? row.from_status} → ` : ""}{STATUS_LABEL[row.to_status as keyof typeof STATUS_LABEL] ?? row.to_status}</p>
                  {row.note ? <p className="text-muted-foreground">{row.note}</p> : null}
                  <p className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">Görüşmeler</h2>
          {lead.conversations.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Konuşma yok.</p> : (
            <ul className="mt-2 space-y-2 text-sm">
              {lead.conversations.map((item) => {
                const row = item as { id: string; channel: string; status: string; message_count: number; external_thread_id: string | null };
                const label = row.channel === "telegram" ? "Eski Telegram kaydı" : row.channel;
                return (
                  <li key={row.id}>
                    {label}
                    {" · "}{row.status} · {num(row.message_count)} mesaj
                  </li>
                );
              })}
            </ul>
          )}
          {lead.messages.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {lead.messages.map((message) => {
                const row = message as { id: string; direction: string; body: string; created_at: string };
                return <li key={row.id}><span className="text-muted-foreground">{row.direction}: </span>{row.body}</li>;
              })}
            </ul>
          ) : null}
        </article>
        <article className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">Ödemeler</h2>
          {lead.payments.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Ödeme kaydı yok. Sağlayıcı bağlı değil.</p> : (
            <ul className="mt-2 text-sm">
              {lead.payments.map((payment) => {
                const row = payment as { id: string; status: string; amount_cents: number; currency: string; verified_via_webhook: boolean };
                return <li key={row.id}>{row.status} · {formatMoney(num(row.amount_cents), row.currency)} · {row.verified_via_webhook ? "doğrulandı" : "doğrulanmadı"}</li>;
              })}
            </ul>
          )}
        </article>
        <article className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">Randevular</h2>
          {lead.appointments.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Randevu kaydı yok.</p> : (
            <ul className="mt-2 text-sm">
              {lead.appointments.map((item) => {
                const row = item as { id: string; starts_at: string; status: string };
                return <li key={row.id}>{formatDateTime(row.starts_at)} · {row.status}</li>;
              })}
            </ul>
          )}
        </article>
      </section>
      <section className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border p-4">
        <div>
          <h2 className="font-medium">Kişisel veri</h2>
          <p className="mt-1 text-sm text-muted-foreground">Dışa aktarma bu dosyayla sınırlıdır. Silme, kimlik alanlarını anonimleştirir.</p>
          <Link className="mt-2 inline-block text-sm text-accent" href={`/admin/adaylar/${lead.id}/disa-aktar`}>JSON indir</Link>
        </div>
        <form action={anonymizeLeadAction} className="flex items-end gap-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <Input name="confirm" placeholder="SIL" className="h-10 w-24" />
          <Button type="submit" variant="destructive" className="h-10">Anonimleştir</Button>
        </form>
      </section>
    </main>
  );
}
