import { inboxReplyAction } from "@/server/actions/telegram";
import { formatDateTime } from "@/lib/format";
import { listTelegramThreads, threadMessages } from "@/server/telegram/inbox";
import { sql } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const instant = false;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function MessagesPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const human = one(params.human) === "1";
  const selected = one(params.chat);
  const notice = one(params.notice);
  const [threads, account] = await Promise.all([
    listTelegramThreads(human),
    sql<{ status: string; last_error: string | null }>("select status, last_error from integration_accounts where provider = 'telegram'"),
  ]);
  const active = threads.find((item) => item.external_thread_id === selected) ?? threads[0];
  const messages = active?.external_thread_id ? await threadMessages(active.external_thread_id) : [];
  const telegram = account[0];
  const state = telegram?.status === "connected" ? "Bağlı" : telegram?.status === "error" ? "Bağlantı hatası" : "Kurulum bekliyor";
  return (
    <main className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Telegram mesajları</h1>
          <p className="mt-2 text-sm text-muted-foreground">Konuşmalar kayıttadır. Anahtar yoksa yanıt panele yazılır ve Telegram hesabına gitmez.</p>
        </div>
        <p className="text-sm">Telegram: {state}</p>
      </div>
      {notice ? <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm">{notice}</p> : null}
      {telegram?.last_error ? <p className="mt-2 text-xs text-muted-foreground">{telegram.last_error}</p> : null}
      <div className="mt-4 flex gap-2 text-sm">
        <a className="rounded-full bg-card px-3 py-2" href="/admin/mesajlar">Tümü</a>
        <a className="rounded-full bg-card px-3 py-2" href="/admin/mesajlar?human=1">Destek ekibi</a>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <ul className="space-y-2">
          {threads.length === 0 ? <li className="rounded-2xl border border-dashed p-4 text-sm">Konuşma yok.</li> : null}
          {threads.map((item) => (
            <li key={item.id}>
              <a href={`/admin/mesajlar?chat=${encodeURIComponent(item.external_thread_id ?? "")}`} className={`block rounded-2xl border p-3 text-sm ${active?.id === item.id ? "border-accent" : "border-border bg-card"}`}>
                <p className="font-medium">Telegram · {item.public_code ?? "Dosya yok"}</p>
                <p className="text-xs text-muted-foreground">Sohbet: {item.external_thread_id}</p>
                <p className="text-xs text-muted-foreground">{item.status === "waiting_human" ? "Destek bekliyor" : "Açık"} · {formatDateTime(item.updated_at)}</p>
              </a>
            </li>
          ))}
        </ul>
        <section className="rounded-2xl border border-border bg-card p-4">
          {active?.external_thread_id ? (
            <>
              <h2 className="font-medium">{active.public_code ?? "Telegram"}</h2>
              <ul className="mt-4 space-y-3">
                {messages.map((message) => (
                  <li key={message.id} className="text-sm">
                    <p className="text-xs text-muted-foreground">{message.direction === "inbound" ? "Gelen" : "Giden"} · {formatDateTime(message.created_at)}</p>
                    <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                  </li>
                ))}
              </ul>
              <form action={inboxReplyAction} className="mt-4 grid gap-2">
                <input type="hidden" name="chat" value={active.external_thread_id} />
                <Textarea name="text" required minLength={1} placeholder="Yanıt" />
                <Button type="submit" className="h-10">Kaydet ve göndermeyi dene</Button>
              </form>
            </>
          ) : <p className="text-sm text-muted-foreground">Seçilecek konuşma yok.</p>}
        </section>
      </div>
    </main>
  );
}
