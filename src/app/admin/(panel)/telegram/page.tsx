export const instant = false;

export default function TelegramDisabledPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="font-serif text-4xl">Telegram devre dışı</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Telegram üzerinden yeni başvuru, takip ve bildirim kapalıdır. Webhook bot akışını çalıştırmaz. Eski konuşmalar ve tablolar veritabanında durur; bu ekrandan mesaj gönderilmez.
      </p>
      <p className="mt-4 text-sm leading-7">
        Yeni mesajlar iletişim formundan gelir ve İletişim kutusunda görünür. Duyuru e-postası <span className="font-medium">CONTACT_NOTIFY_EMAIL</span> tanımlıysa gider.
      </p>
    </main>
  );
}
