import { readNotificationsAction } from "@/server/actions/assistant-admin";
import { formatDateTime } from "@/lib/format";
import { sql } from "@/server/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const instant = false;

export default async function NotificationsPage() {
  const rows = await sql<{ id: string; title: string; body: string; href: string | null; read_at: string | null; created_at: string }>(
    "select id, title, body, href, read_at, created_at from notifications order by created_at desc limit 80",
  );
  const unread = rows.filter((row) => !row.read_at).length;
  return (
    <main className="mx-auto max-w-3xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Bildirimler</h1>
          <p className="mt-2 text-sm text-muted-foreground">{unread} okunmamış kayıt. Telegram bağlı değilse başvuru yine burada ve aday listesinde durur.</p>
        </div>
        <form action={readNotificationsAction}>
          <Button type="submit" variant="outline" className="h-10">Okundu işaretle</Button>
        </form>
      </div>
      {rows.length === 0 ? <p className="mt-8 text-sm">Henüz bildirim yok.</p> : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-medium">{row.title}</p>
              <p className="mt-1 text-sm">{row.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(row.created_at)} · {row.read_at ? "Okundu" : "Yeni"}</p>
              {row.href ? <Link href={row.href} className="mt-2 inline-block text-sm text-accent">Aç</Link> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
