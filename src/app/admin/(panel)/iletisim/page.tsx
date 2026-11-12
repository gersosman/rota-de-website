import { contactUpdateAction } from "@/server/actions/operations";
import { formatDateTime } from "@/lib/format";
import { listContactMessages } from "@/server/operations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const instant = false;

const STATUS = [
  ["new", "Yeni"],
  ["reviewing", "İnceleniyor"],
  ["waiting", "Yanıt bekliyor"],
  ["answered", "Yanıtlandı"],
  ["closed", "Kapatıldı"],
] as const;

export default async function ContactInboxPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const rows = await listContactMessages();
  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="font-serif text-4xl">İletişim talepleri</h1>
      <p className="mt-2 text-sm text-muted-foreground">Kayıt veritabanındadır. E-posta servisi bağlı olmadığı için panelden yazılan not karşı tarafa e-posta olarak gitmez.</p>
      {notice ? <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm">{notice}</p> : null}
      {rows.length === 0 ? <p className="mt-8 text-sm">Talep yok.</p> : null}
      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium">{row.full_name} · {row.public_code ?? "Dosya yok"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.email || "E-posta yok"} · {row.contact_preference} · {formatDateTime(row.created_at)}</p>
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{row.message}</p>
            <form action={contactUpdateAction} className="mt-3 grid gap-2">
              <input type="hidden" name="id" value={row.id} />
              <select name="status" defaultValue={row.status} className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
                {STATUS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <Textarea name="notes" defaultValue={row.admin_notes ?? ""} placeholder="İç not. E-posta gönderilmez." />
              <Button type="submit" className="h-10">Kaydı güncelle</Button>
            </form>
          </article>
        ))}
      </div>
    </main>
  );
}
