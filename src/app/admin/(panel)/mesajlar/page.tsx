import { checkWhatsappAction, deskWhatsappAction, pauseWhatsappAction, replyMessageAction } from "@/server/actions/whatsapp";
import { formatDateTime, isUuid } from "@/lib/format";
import { buttonsForWaStep } from "@/lib/whatsapp/engine";
import { listThreads, threadMessages, whatsappDesk } from "@/server/whatsapp/inbox";
import { sql } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const instant = false;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function stateLabel(status: string) {
  if (status === "connected") return "Bağlı";
  if (status === "error") return "Bağlantı hatası";
  return "Kurulum bekleniyor";
}

function deliveryLabel(status: string | null) {
  if (status === "sent") return "Gönderildi";
  if (status === "delivered") return "Teslim edildi";
  if (status === "read") return "Okundu";
  if (status === "failed") return "Başarısız";
  if (status === "sending") return "Gönderiliyor";
  if (status === "unsent") return "Kayda geçti";
  return "";
}

export default async function MessagesPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const channel = one(params.channel);
  const human = one(params.human) === "1";
  const selected = one(params.id);
  const notice = one(params.notice);
  const [threads, account, deskStep] = await Promise.all([
    listThreads(channel, human),
    sql<{ status: string; last_error: string | null }>("select status, last_error from integration_accounts where provider = 'whatsapp'"),
    whatsappDesk(),
  ]);
  const active = threads.find((item) => item.id === selected) ?? threads[0];
  const messages = active && isUuid(active.id) ? await threadMessages(active.id) : [];
  const whatsapp = account[0];
  return (
    <main className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Mesajlar</h1>
          <p className="mt-2 text-sm text-muted-foreground">WhatsApp ve Telegram aynı kutudadır. Kişisel numara gösterilmez.</p>
        </div>
        <p className="text-sm">WhatsApp: {stateLabel(whatsapp?.status ?? "disconnected")}</p>
      </div>
      {notice ? <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm">{notice}</p> : null}
      {whatsapp?.last_error ? <p className="mt-2 text-xs text-muted-foreground">{whatsapp.last_error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <a className="rounded-full bg-card px-3 py-2" href="/admin/mesajlar">Tümü</a>
        <a className="rounded-full bg-card px-3 py-2" href="/admin/mesajlar?channel=whatsapp">WhatsApp</a>
        <a className="rounded-full bg-card px-3 py-2" href="/admin/mesajlar?channel=telegram">Telegram</a>
        <a className="rounded-full bg-card px-3 py-2" href="/admin/mesajlar?human=1">İnsan desteği</a>
        <form action={checkWhatsappAction}><Button type="submit" variant="outline" className="h-9">Bağlantıyı denetle</Button></form>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <ul className="space-y-2">
          {threads.length === 0 ? <li className="rounded-2xl border border-dashed p-4 text-sm">Konuşma yok.</li> : null}
          {threads.map((item) => (
            <li key={item.id}>
              <a href={`/admin/mesajlar?id=${item.id}${channel ? `&channel=${channel}` : ""}`} className={`block rounded-2xl border p-3 text-sm ${active?.id === item.id ? "border-accent" : "border-border bg-card"}`}>
                <p className="font-medium">{item.channel === "whatsapp" ? "WhatsApp" : "Telegram"} · {item.public_code ?? "Dosya yok"}</p>
                <p className="text-xs text-muted-foreground">{item.status === "waiting_human" ? "İnsan bekliyor" : "Açık"} · {formatDateTime(item.updated_at)}</p>
              </a>
            </li>
          ))}
        </ul>
        <section className="rounded-2xl border border-border bg-card p-4">
          {active ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium">{active.public_code ?? active.channel}</h2>
                {active.channel === "whatsapp" ? (
                  <form action={pauseWhatsappAction}>
                    <input type="hidden" name="conversation" value={active.id} />
                    <input type="hidden" name="paused" value={active.status === "waiting_human" ? "false" : "true"} />
                    <Button type="submit" variant="outline" className="h-9">{active.status === "waiting_human" ? "Botu aç" : "Botu durdur"}</Button>
                  </form>
                ) : null}
              </div>
              <ul className="mt-4 max-h-[28rem] space-y-3 overflow-auto">
                {messages.map((message) => (
                  <li key={message.id} className="text-sm">
                    <p className="text-xs text-muted-foreground">{message.direction === "inbound" ? "Gelen" : "Giden"} · {deliveryLabel(message.delivery_status)} · {formatDateTime(message.created_at)}</p>
                    <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                  </li>
                ))}
              </ul>
              <form action={replyMessageAction} className="mt-4 grid gap-2">
                <input type="hidden" name="channel" value={active.channel} />
                <input type="hidden" name="conversation" value={active.id} />
                <input type="hidden" name="chat" value={active.external_thread_id ?? ""} />
                <Textarea name="text" required minLength={1} maxLength={1000} placeholder="Cevap" className="min-h-24" />
                <Button type="submit" className="h-11">Cevabı gönder</Button>
              </form>
            </>
          ) : <p className="text-sm">Seçilecek konuşma yok.</p>}
        </section>
      </div>
      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-medium">Yerel WhatsApp denemesi</h2>
        <p className="mt-1 text-sm text-muted-foreground">Bu kutu WhatsApp değildir. Cevap işletme hattına gitmez.</p>
        <form action={deskWhatsappAction} className="mt-3 grid gap-2">
          <Textarea name="text" placeholder="Ad veya şehir adımı için yaz" className="min-h-20" />
          <Button type="submit" className="h-10 w-fit">Metni gönder</Button>
          <div className="flex flex-wrap gap-2">
            {buttonsForWaStep(deskStep).map((button) => (
              <Button key={button.id} type="submit" name="button" value={button.id} variant="outline" className="h-10">{button.title}</Button>
            ))}
          </div>
        </form>
      </section>
    </main>
  );
}
