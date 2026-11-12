# ROTA DE

Türkiye'den Almanya'ya profesyonel tır şoförlüğü düşünen adaylar için danışmanlık ve müşteri yönetim platformu.

Bu depo herkese açık site, başvuru takip, yönetici paneli, CRM ve adım adım ön değerlendirme içerir. İletişim kanalı e-postadır. Telegram botu ve WhatsApp kapalıdır; eski tablolar durur. Yapay zekâ ancak `OPENAI_API_KEY` tanımlıysa cevap verir.

## Ne işe yarar

Ziyaretçi ücretsiz ön değerlendirmeyi adım adım doldurur. Şehir alanı, proje içindeki GeoNames Almanya ve Türkiye yerleşim listesinden öneri sunar (CC BY 4.0); yazım sırasında dış bir servise istek gitmez. Başvuruda e-posta zorunludur. Sistem `ROTA-yıl-kod` biçiminde tahmin edilmesi zor bir başvuru numarası üretir. Kayıt, e-posta bildiriminden bağımsızdır: mektup kurulmamışsa veya gönderilemezse başvuru silinmez. Aday bu numarayı, başvuruda yazdığı e-posta ile `/basvuru-takip` ekranından sorgular. Eski kayıtlarda telefon da doğrulayıcı olarak durur. Yönetici dosyayı ilk kez açınca durum “Başvuru Alındı”ndan “Başvurunuz İnceleniyor”a geçer. Bu bir vize, oturum veya iş kararı değildir.

Site Türkçe ve Almancadır. Yönetim paneli Türkçedir. Kişisel telefon ve kişisel e-posta yayımlanmaz. Yönetici duyurusu `CONTACT_NOTIFY_EMAIL` ile gider. Yapay zekâ asistanı model anahtarı olmadan cevap uydurmaz.

Metinler kısa ve kurumsal kalır. “Ne yapar, ne yapmaz”, “İnsan inceler” ve belirsiz “bir süre sonra deneyin” kalıpları kullanılmaz. Sunulmayan bir belge incelemesi veya garanti yazılmaz. Gündüz ve gece renkleri `globals.css` içindeki ortak belirteçlerden gelir; hero bölümü de bu belirteçleri kullanır.

## Çalıştırma

```bash
npm install
npm run dev
```

Geliştirme sunucusu `4177` portunu kullanır. Tarayıcıda `http://127.0.0.1:4177` açın. Bu adres geliştirme yapılandırmasında izinlidir; aksi halde sayfa görünür ama formlar tepki vermez. Üretim derlemesi:

```bash
npm run build
npm start
```

İlk yönetici, henüz kullanıcı yokken `/admin/kurulum` adresinden oluşturulur. Geliştirmede kurulum anahtarı boş bırakılabilir. Üretimde `ADMIN_SETUP_TOKEN` zorunludur. Kurulumdan sonra yönetici bir kimlik doğrulayıcı (TOTP) eklemeden panele giremez.

## Ortam

`.env.example` dosyasına bakın. `DATABASE_URL` boşsa uygulama `data/pglite` içinde yerel Postgres uyumlu bir veritabanı açar. Yayın ortamında platform `DATABASE_URL` verir. Supabase kullanılacaksa sunucu tarafındaki bağlantı dizesi bu değişkene yazılır; anahtar tarayıcıya konmaz.

## Komutlar

- `npm run dev` geliştirme
- `npm run test` sınıflandırma, parola, TOTP, şema ve migrasyon testleri
- `npm run lint` ESLint
- `npm run typecheck` TypeScript
- `npm run build` üretim derlemesi ve, `DATABASE_URL` varsa, migrasyon

## Veri

Şema `migrations/001_init.sql` içindedir. Tablolarda satır düzeyi güvenlik açıktır ve anonim role politika verilmez. Uygulama tablo sahibi olarak bağlanır. Gizli entegrasyon anahtarları tablolara yazılmaz; yalnızca ortam değişkeninin adı durur.

Ön değerlendirme yaş, dil veya tecrübe aralığını yasal eşik olarak kullanmaz. Mevzuat metinleri `legislation_versions` tablosunda sürümlenir ve panelden güncellenir. Başlangıç metni doğrulanmamış taslaktır.

## Faz durumu

Faz 1 tamam. Faz 2 Telegram, Faz 3 Instagram, Faz 4 içerik stüdyosu, Faz 5 ödeme ve randevu, Faz 6 AI ve raporlama. Ayrıntı `docs/MIMARI.md` ve `docs/FAZ-1.md` dosyalarındadır.
