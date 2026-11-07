# Faz 2

Telegram botu, webhook ve CRM bağlantısı.

Bot, kişisel telefon numarası göstermez ve numarayı zorunlu tutmaz. Yazışma bot kullanıcı adıyla olur. Token veya https webhook adresi yoksa hesap bağlı görünmez.

Yerel deneme `/admin/telegram` üzerindedir. Aynı düğme akışını çalıştırır, kaydı CRM'e yazar ve Telegram'a göndermez.

Webhook `POST /api/telegram/webhook` yalnızca `X-Telegram-Bot-Api-Secret-Token` eşleşirse işler. Aynı `update_id` ikinci kez dosya açmaz.

Komutlar: `/start`, `/help`, `/services`, `/precheck`, `/faq`, `/contact`, `/human`.

Instagram, ödeme, randevu ve AI cevap bu fazda yoktur.
