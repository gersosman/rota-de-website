# Faz 1 raporu

## Tamamlanan

- Türkçe ve Almanca kamu sitesi: ana sayfa, süreç, Almanya'da şoförlük, şartlar, hizmetler, SSS, ön değerlendirme, iletişim, Impressum, Datenschutz, AGB, iptal ve iade.
- Yasal sayfalar işletme alanı boşsa doldurulacak der ve metni yayına hazır ilan etmez.
- `/admin` paneli: genel bakış, aday listesi ve dosya, durum geçmişi, not, takip tarihi, bilgi bankası, denetim, ayarlar, entegrasyon durumu.
- Parola, TOTP, kurtarma kodu, üretimde kurulum anahtarı.
- Ön değerlendirme CRM'e dosya, değerlendirme, onay ve durum olayı yazar.
- Postgres şeması, RLS, yerel PGlite ve `DATABASE_URL` yolu.
- Testler: senaryo ayrımı, parola, TOTP, origin, şema, RLS ve webhook'suz başarılı ödemenin reddi.

## Bilinçli olarak yapılmayan

- Telegram, Instagram, e-posta gönderimi, ödeme tahsilatı, randevu çakışma motoru, içerik yayını, AI cevap.
- Pasaport veya kimlik toplama.
- Otomasyon anahtarını açınca görev üretmek. Anahtarlar kapalıdır ve çalıştırıcı yoktur.
- Yasal metni avukat onaylı gibi sunmak.

## Doğrulama

`npm run test`, `npm run lint` ve `npm run build` Faz 1 kodu üzerinde çalıştırıldı. Ayrıntı teslim notundadır.

## Faz 2 öncesi eksikler

- Telegram bot token'ı ve webhook sırrı yok. Bağlanınca `integration_accounts.telegram` ancak imzası doğrulanmış çağrıdan sonra `connected` olabilir.
- Gelen mesajı konuşmaya ve adaya bağlayan işleyici yok.
- Otomasyon kuyruğu tablosu var, işçisi yok. İşçi kalıcı `automation_jobs` satırını işlemeli ve aynı `idempotency_key` ikinci kez iş açmamalı.
- E-posta adaptörü yok. Randevu hatırlatması bu yüzden gönderilemez.
