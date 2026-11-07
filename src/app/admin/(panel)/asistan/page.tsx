import { assistantSettingsAction, knowledgeAction } from "@/server/actions/assistant-admin";
import { assistantSettings, listAssistantChats, listKnowledge } from "@/server/assistant";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const instant = false;

export default async function AssistantAdminPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const [settings, knowledge, chats] = await Promise.all([assistantSettings(), listKnowledge(), listAssistantChats()]);
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">Asistan</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {settings.configured ? "OpenAI anahtarı tanımlı. Anahtarın kendisi burada görünmez." : "Kurulum bekleniyor. OPENAI_API_KEY yok. Asistan uydurma cevap vermez."}
        {settings.enabled ? " Özellik açık." : " Özellik panelden kapalı."}
      </p>
      {notice ? <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">{notice}</p> : null}
      <form action={assistantSettingsAction} className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} /> Asistan açık</label>
        <Input name="dailyLimit" type="number" min={5} max={500} defaultValue={settings.dailyLimit} className="h-10" />
        <p className="text-xs text-muted-foreground">Aynı ziyaretçi için günlük mesaj üst sınırı.</p>
        <Button type="submit" className="h-10">Kaydet</Button>
      </form>
      <h2 className="mt-10 font-medium">Onaylı bilgi</h2>
      <form action={knowledgeAction} className="mt-3 grid gap-3 rounded-2xl border border-border bg-card p-4">
        <Input name="title" required minLength={3} placeholder="Başlık" className="h-10" />
        <Textarea name="body" required minLength={10} placeholder="Asistanın kullanacağı metin" />
        <Input name="sourceUrl" placeholder="Kaynak bağlantısı" className="h-10" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked /> Kullanılsın</label>
        <Button type="submit" className="h-10">Bilgi ekle</Button>
      </form>
      <ul className="mt-4 space-y-3">
        {knowledge.map((item) => (
          <li key={item.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
            <form action={knowledgeAction} className="grid gap-2">
              <input type="hidden" name="id" value={item.id} />
              <Input name="title" defaultValue={item.title} className="h-10" />
              <Textarea name="body" defaultValue={item.body} />
              <Input name="sourceUrl" defaultValue={item.source_url ?? ""} className="h-10" />
              <label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={item.enabled} /> Açık</label>
              <Button type="submit" variant="outline" className="h-10">Güncelle</Button>
            </form>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-medium">Son konuşmalar</h2>
      <p className="mt-1 text-sm text-muted-foreground">Konuşma metni saklanır. Yönetim işlemi bu ekrandan yapılmaz.</p>
      {chats.length === 0 ? <p className="mt-3 text-sm">Henüz konuşma yok.</p> : (
        <ul className="mt-3 space-y-2 text-sm">
          {chats.map((chat) => (
            <li key={chat.id} className="rounded-xl border border-border px-3 py-2">
              <p className="line-clamp-2">{chat.body || "Boş"}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(chat.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
