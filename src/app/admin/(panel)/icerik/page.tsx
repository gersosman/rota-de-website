import { articleAction, publishArticleAction } from "@/server/actions/operations";
import { listArticles } from "@/server/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const instant = false;

export default async function ContentPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const rows = await listArticles();
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">Web sitesi içerikleri</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Bilgi merkezi metinleri kaynaksız ve onaysız yayına çıkmaz. Kayıt taslak kalır. Hukuki metin, kontrol tarihi yenilenmeden güncel sayılmaz.</p>
      {notice ? <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm">{notice}</p> : null}
      <form action={articleAction} className="mt-6 grid gap-2 rounded-2xl border border-border bg-card p-4">
        <Input name="slug" required placeholder="adres-kodu" className="h-10" />
        <select name="locale" className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="tr">Türkçe</option>
          <option value="de">Almanca</option>
        </select>
        <Input name="title" required placeholder="Başlık" className="h-10" />
        <Textarea name="body" required placeholder="Metin" />
        <Input name="sourceLabel" placeholder="Kaynak adı" className="h-10" />
        <Input name="sourceUrl" placeholder="https:// resmi kaynak" className="h-10" />
        <Input name="reviewedOn" type="date" className="h-10" />
        <Button type="submit" className="h-10">Taslak kaydet</Button>
      </form>
      <ul className="mt-6 space-y-3">
        {rows.length === 0 ? <li className="text-sm text-muted-foreground">Ek içerik yok. Bilgi merkezi sayfası yerleşik ve kaynaklı metni gösterir.</li> : null}
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
            <p className="font-medium">{row.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.locale} · {row.status} · {row.reviewed_on ?? "tarih yok"}</p>
            <div className="mt-3 flex gap-2">
              <form action={publishArticleAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="publish" value="yes" />
                <Button type="submit" className="h-9">Yayınla</Button>
              </form>
              <form action={publishArticleAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="publish" value="no" />
                <Button type="submit" variant="outline" className="h-9">Taslağa al</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
