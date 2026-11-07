import Link from "next/link";
import {
  checkTelegramAction,
  deskTurnAction,
  resetDeskAction,
  staffReplyAction,
  welcomeTelegramAction,
} from "@/server/actions/telegram";
import { formatDateTime } from "@/lib/format";
import { buttonsForStep, normalizeStep } from "@/lib/telegram/engine";
import { sql } from "@/server/db";
import { telegramOverview, threadMessages } from "@/server/telegram/inbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const instant = false;

function chatFrom(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && /^(tg:-?\d{1,20}|desk:local)$/.test(raw) ? raw : "desk:local";
}

export default async function TelegramPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const chat = chatFrom(params.chat);
  const notice = typeof params.notice === "string" ? params.notice : "";
  const [overview, messages, session] = await Promise.all([
    telegramOverview(),
    threadMessages(chat),
    sql<{ step: string }>("select step from telegram_sessions where chat_key = 'desk:local'"),
  ]);
  const connected = overview.status === "connected";
  const deskStep = normalizeStep(session[0]?.step);
  const buttons = chat === "desk:local" && deskStep !== "idle" ? buttonsForStep(deskStep).flat() : [];

  return (
    <main className="mx-auto max-w-5xl">
      <h1 className="font-serif text-4xl">Telegram</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Yazışma bot kullanıcı adıyla yürür. Kişisel telefon istenmez ve yayımlanmaz.
        {connected ? ` Bağlı hesap @${overview.username}.` : " Bot bağlı değil."}
      </p>
      {notice ? <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">{notice}</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium">Bağlantı</h2>
            <span className="rounded-full bg-muted px-2 py-1 text-xs">{connected ? "Bağlı" : "Bağlı değil"}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{overview.detail}</p>
          <form action={checkTelegramAction} className="mt-4">
            <Button type="submit" className="h-10">Bağlantıyı denetle</Button>
          </form>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">Otomatik karşılama</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {overview.welcome ? "Açık. /start menüyü verir." : "Kapalı. Komutlar yine çalışır, serbest metin kısa tutulur."}
          </p>
          <form action={welcomeTelegramAction} className="mt-4">
            <input type="hidden" name="enabled" value={overview.welcome ? "false" : "true"} />
            <Button type="submit" variant="outline" className="h-10">{overview.welcome ? "Karşılamayı kapat" : "Karşılamayı aç"}</Button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-700/30 bg-amber-50 p-4 text-amber-950">
        <h2 className="font-medium">Yerel deneme</h2>
        <p className="mt-1 text-sm">Bu kutu Telegram değildir. Gönderilen cevap bot hesabına gitmez.</p>
        <form action={deskTurnAction} className="mt-4 grid gap-3">
          <Input name="text" placeholder="Yazın veya düğmeye basın" className="h-11 bg-white" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-10">Gönder</Button>
            {buttons.map((button) => (
              <Button key={button.data} type="submit" name="callback" value={button.data} variant="outline" className="h-10 bg-white">
                {button.label}
              </Button>
            ))}
          </div>
        </form>
        {chat === "desk:local" && deskStep === "idle" ? (
          <form action={deskTurnAction} className="mt-3 flex flex-wrap gap-2">
            {[
              ["Ön kayıt", "precheck"],
              ["Hizmetler", "services"],
              ["Sorular", "faq"],
              ["İletişim", "contact"],
              ["İnsan", "human"],
            ].map(([label, data]) => (
              <Button key={data} type="submit" name="callback" value={data} variant="outline" className="h-10 bg-white">
                {label}
              </Button>
            ))}
          </form>
        ) : null}
        <form action={resetDeskAction} className="mt-3">
          <Button type="submit" variant="ghost" className="h-10">Sıfırla</Button>
        </form>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[240px_1fr]">
        <ul className="rounded-2xl border border-border bg-card">
          <li>
            <Link href="/admin/telegram?chat=desk:local" className="block px-3 py-3 text-sm hover:bg-muted">Yerel deneme</Link>
          </li>
          {overview.threads.filter((thread) => thread.external_thread_id && thread.external_thread_id !== "desk:local").map((thread) => (
            <li key={thread.id} className="border-t border-border">
              <Link href={`/admin/telegram?chat=${encodeURIComponent(thread.external_thread_id || "")}`} className="block px-3 py-3 text-sm hover:bg-muted">
                <span className="block">{thread.public_code || thread.external_thread_id}</span>
                <span className="text-xs text-muted-foreground">{thread.status} · {formatDateTime(thread.updated_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">{chat === "desk:local" ? "Yerel kayıt" : chat}</h2>
          <ul className="mt-3 max-h-96 space-y-3 overflow-y-auto">
            {messages.length === 0 ? <li className="text-sm text-muted-foreground">Mesaj yok.</li> : null}
            {messages.map((message) => (
              <li key={message.id} className="text-sm">
                <p className="text-xs text-muted-foreground">
                  {message.direction === "inbound" ? "Gelen" : "Giden"}
                  {message.category === "desk" || message.category === "admin_unsent" ? " · Telegram'a gitmedi" : ""}
                  {message.category === "send_failed" ? " · gönderilemedi" : ""}
                  {" · "}
                  {formatDateTime(message.created_at)}
                </p>
                <p className="mt-1">{message.body}</p>
              </li>
            ))}
          </ul>
          <form action={staffReplyAction} className="mt-4 grid gap-2">
            <input type="hidden" name="chat" value={chat} />
            <Input name="text" required minLength={1} placeholder="Yönetici cevabı" className="h-11" />
            <Button type="submit" variant="outline" className="h-10">Cevabı kaydet</Button>
          </form>
        </section>
      </div>
    </main>
  );
}
