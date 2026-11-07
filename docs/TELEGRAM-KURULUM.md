# Telegram kurulumu

Bu rehber, kod yazmadan botu bağlamak içindir. Token’ı sohbete veya siteye yazmayın. Değerleri yalnızca barındırma ekranındaki gizli alanlara kaydedin.

1. Telefonunuzda Telegram’ı açın. Botun sahibi olacak hesap bu hesap olsun.
2. Arama çubuğuna `BotFather` yazın ve mavi tikli resmi hesabı açın.
3. Sohbete `/newbot` yazın.
4. Görünen ad için `ROTA DE` yazın. Kullanıcı adı `bot` ile bitsin ve boş olsun.
5. BotFather’ın verdiği token’ı `TELEGRAM_BOT_TOKEN` gizli alanına kaydedin.
6. Uzun rastgele bir cümleyi `TELEGRAM_WEBHOOK_SECRET` alanına kaydedin.
7. Sitenin `https://` adresini `APP_URL` alanına yazın.
8. Yönetim panelinde Telegram sayfasını açın ve “Bağlantıyı denetle”ye basın. “Bağlı” yazısı webhook’un kurulduğunu gösterir.
9. Kendi hesabınızdan bota `/start` gönderin.
10. Yönetim panelinde Telegram mesajlarını açın. `tg:` ile başlayan sohbet numarası yönetici kimliğinizdir. Yalnız rakamı `TELEGRAM_ADMIN_CHAT_ID` alanına kaydedin. Bu bir telefon numarası değildir.
11. Aynı sohbetten bir deneme mesajı daha gönderin. Panelden yanıt yazın. Yanıt Telegram’da görünürse kurulum tamamdır.

Bağlı değilse panel “Kurulum bekleniyor” der. Hata cümlesi Telegram sayfasındaki bağlantı kutusunda görünür. Başvurular bot olmasa da veritabanına kaydolur.
