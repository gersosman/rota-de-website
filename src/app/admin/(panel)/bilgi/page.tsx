import { deleteFaqAction, saveFaqAction, saveLegislationAction } from "@/server/actions/settings";
import { activeLegislation, listFaqs, listLegislation } from "@/server/knowledge";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const instant = false;

export default async function KnowledgePage() {
  const [current, versions, faqs] = await Promise.all([activeLegislation(), listLegislation(), listFaqs()]);
  const law = current as Record<string, string> | null;
  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="font-serif text-4xl">Bilgi bankası</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Mevzuat metinleri sürümlenir. Aktif sürüm ön değerlendirme kaydına bağlanır. Metin hukuk onayı değildir.
        AI cevaplayıcı bu fazda kapalıdır; yayımlanan sorular sitede görünür.
      </p>
      <form action={saveLegislationAction} className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Yeni mevzuat sürümü</h2>
        <p className="text-xs text-muted-foreground">Kayıt yeni bir sürüm açar ve eskisini arşivler. Rakamlı yasal eşik yazmayın.</p>
        <Input name="versionLabel" required defaultValue={law ? `${law.version_label}-sonraki` : "taslak-1"} className="h-10" />
        <select name="reviewStatus" defaultValue={law?.review_status ?? "unverified"} className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="unverified">Doğrulanmadı</option>
          <option value="internal_draft">İç taslak</option>
          <option value="reviewed_internally">İç inceleme yapıldı</option>
        </select>
        <Textarea name="summaryTr" required minLength={20} defaultValue={law?.summary_tr} placeholder="Türkçe özet" />
        <Textarea name="summaryDe" required minLength={20} defaultValue={law?.summary_de} placeholder="Almanca özet" />
        <Input name="abs1LabelTr" required defaultValue={law?.abs1_label_tr} />
        <Input name="abs1LabelDe" required defaultValue={law?.abs1_label_de} />
        <Textarea name="abs1NoteTr" required minLength={20} defaultValue={law?.abs1_note_tr} />
        <Textarea name="abs1NoteDe" required minLength={20} defaultValue={law?.abs1_note_de} />
        <Input name="abs2LabelTr" required defaultValue={law?.abs2_label_tr} />
        <Input name="abs2LabelDe" required defaultValue={law?.abs2_label_de} />
        <Textarea name="abs2NoteTr" required minLength={20} defaultValue={law?.abs2_note_tr} />
        <Textarea name="abs2NoteDe" required minLength={20} defaultValue={law?.abs2_note_de} />
        <Button type="submit" className="h-10">Sürümü kaydet</Button>
      </form>
      <ul className="mt-4 text-sm text-muted-foreground">
        {versions.map((item) => {
          const row = item as { id: string; version_label: string; review_status: string; is_active: boolean; updated_at: string };
          return <li key={row.id}>{row.version_label} · {row.review_status} · {row.is_active ? "aktif" : "arşiv"} · {formatDateTime(row.updated_at)}</li>;
        })}
      </ul>
      <form action={saveFaqAction} className="mt-10 grid gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Soru ekle</h2>
        <select name="locale" className="h-10 rounded-lg border border-input bg-card px-2 text-sm">
          <option value="tr">Türkçe</option>
          <option value="de">Deutsch</option>
        </select>
        <Input name="question" required minLength={5} placeholder="Soru" className="h-10" />
        <Textarea name="answer" required minLength={5} placeholder="Cevap" />
        <Input name="sourceNote" placeholder="Kaynak notu" className="h-10" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" /> Yayımla</label>
        <Button type="submit" className="h-10">Kaydet</Button>
      </form>
      <ul className="mt-4 space-y-3">
        {faqs.map((item) => {
          const row = item as { id: string; locale: string; question: string; answer: string; published: boolean };
          return (
            <li key={row.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
              <p className="text-xs text-muted-foreground">{row.locale} · {row.published ? "yayında" : "taslak"}</p>
              <p className="mt-1 font-medium">{row.question}</p>
              <p className="mt-1 text-muted-foreground">{row.answer}</p>
              <form action={deleteFaqAction} className="mt-2">
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" variant="outline" size="sm">Sil</Button>
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
