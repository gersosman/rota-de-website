import { approveStoryAction, testimonialAction } from "@/server/actions/operations";
import { listTestimonials } from "@/server/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const instant = false;

export default async function StoriesPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const rows = await listTestimonials();
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">Başarı hikâyeleri</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Yayın izni ve onay olmadan sitede görünmez. Temsili örnek gerçek yorum olarak yayınlanamaz. Telefon ve fotoğraf istenmez.</p>
      {notice ? <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm">{notice}</p> : null}
      <form action={testimonialAction} className="mt-6 grid gap-2 rounded-2xl border border-border bg-card p-4">
        <Input name="name" required placeholder="Görünen ad veya takma ad" className="h-10" />
        <Input name="city" placeholder="Şehir" className="h-10" />
        <Input name="stage" placeholder="Sürecin aşaması" className="h-10" />
        <Textarea name="body" required minLength={8} placeholder="Yorum" />
        <label className="flex gap-2 text-sm"><input type="checkbox" name="consent" />Yayın izni var</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" name="representative" />Bu temsili örnektir</label>
        <Button type="submit" className="h-10">Taslak kaydet</Button>
      </form>
      <ul className="mt-6 space-y-3">
        {rows.length === 0 ? <li className="text-sm text-muted-foreground">Kayıtlı yorum yok.</li> : null}
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
            <p className="font-medium">{row.display_name}{row.city ? ` · ${row.city}` : ""}</p>
            <p className="mt-2 leading-6">{row.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">{row.approved ? "Yayında" : "Taslak"} · {row.publication_consent ? "izin var" : "izin yok"} · {row.representative ? "temsili" : "gerçek kayıt"}</p>
            <div className="mt-3 flex gap-2">
              <form action={approveStoryAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="approve" value="yes" />
                <Button type="submit" className="h-9">Yayınla</Button>
              </form>
              <form action={approveStoryAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="approve" value="no" />
                <Button type="submit" variant="outline" className="h-9">Yayından al</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
