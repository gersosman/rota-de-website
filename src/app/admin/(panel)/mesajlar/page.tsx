import Link from "next/link";

export const instant = false;

export default function MessagesDisabledPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="font-serif text-4xl">Telegram mesajları kapalı</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Bu kutu artık Telegram’a bağlanmaz ve yanıt göndermez. Geçmiş satırlar silinmedi. Yeni yazışma e-posta ile yürür.
      </p>
      <Link href="/admin/iletisim" className="mt-6 inline-flex text-sm text-accent">İletişim kayıtlarına git</Link>
    </main>
  );
}
