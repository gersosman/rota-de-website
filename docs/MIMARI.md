# ROTA DE mimarisi

## Bağlam

Çalışma klasörü boş bir kök commit idi. Ürün sıfırdan kuruldu. Faz 1 dışında çalışan entegrasyon yoktur.

## Katmanlar

```text
src/app            Next.js App Router sayfaları ve dışa aktarma rotası
src/components     Site, form ve panel arayüzü
src/lib            Saf kurallar: sınıflandırma, şema, parola, TOTP, HMAC
src/server         Veritabanı, oturum, CRM ve server action'lar
migrations         Postgres şeması
```

Sunucu modülleri `server-only` ile işaretlidir. Tarayıcı paketine veritabanı, parola veya şifreleme anahtarı girmez.

Entegrasyonlar birbirinden bağımsız satırlardır (`integration_accounts`). Biri kopuksa diğeri sorgulanmaya devam eder. Faz 1'de dördü de `disconnected` durumundadır. Durum, başarılı bir API çağrısı olmadan `connected` yapılmaz.

## Arayüzler

Herkese açık site `src/app/(site)` altındadır. Dil çerezi `rota_locale` değeridir; varsayılan Türkçedir.

Yönetim `/admin` altındadır. Oturum çerezi yoksa proxy girişe yollar. Asıl yetki kontrolü sunucudadır: `requirePanel` geçerli oturum, `admin` rolü, açık MFA ve doğrulanmış ikinci adım ister. `operator` rolü şemada durur, Faz 1'de panele alınmaz.

## Roller

| Rol | Kim | Faz 1 |
| --- | --- | --- |
| Ziyaretçi | Hesapsız | Form ve sayfalar |
| Yönetici | `profiles.role = admin` | Panel, MFA zorunlu |
| Operatör | şemada var | Kapalı |

Adaylar kullanıcı hesabı açmaz. Dosya numarası `RD-yıl-sıra` biçimindedir.

## Kimlik

Parolalar scrypt ile saklanır. Oturum çerezi `httpOnly`, `SameSite=Lax` ve üretimde `Secure` olur. Veritabanında yalnızca token özeti durur. MFA TOTP'dir; sır AES-256-GCM ile şifrelenir. Anahtar `APP_ENCRYPTION_KEY` ya da veritabanında üretilen `internal_keys` kaydıdır. Kurtarma kodları düz metin saklanmaz.

Supabase Auth bu fazda bağlı değildir. `profiles.auth_user_id` ileride `auth.users` ile eşleşmek için boş durur. Panel sahte bir Supabase oturumu göstermez.

Üretimde ilk yönetici `ADMIN_SETUP_TOKEN` olmadan açılamaz.

## Veritabanı

Tek sorgu modülü `src/server/db.ts`. `DATABASE_URL` varsa `pg`, yoksa kalıcı PGlite. Üretim derlemesi sırasında bellek içi PGlite kullanılır; derleme dosyaya yazmaz.

Migrasyonlar eklemelidir. `scripts/migrate.mjs` yalnızca `DATABASE_URL` varken çalışır.

Satır düzeyi güvenlik tüm uygulama tablolarında açıktır. Politika yoktur; anonim ve `authenticated` roller okuyamaz. Sunucu tablo sahibi olduğu için bu politikayı aşar. Tarayıcıdan Supabase anon anahtarı ile tabloya gidilmez.

Ödeme satırı `succeeded` olamaz, `verified_via_webhook` doğru değilse. Faz 1 bu satırı üretmez. Satış sayısı yalnızca bu koşulu sağlayan kayıtlardan gelir.

## Ön değerlendirme

`classifyAssessment` saf bir fonksiyondur. Yaş, Almanca ve niyet senaryoyu değiştirmez. AB/AEA belgesi ve Code 95 birlikte bildirilmişse dosya Abs. 1 izine, meslekî tır sınıfı olup Code 95 yok denmişse Abs. 2 izine düşer. Belirsiz veya eksik cevap `NEEDS_REVIEW` olur. Metinler hukuki karar olmadığını söyler. Eşikler kodda sabit değildir; açıklama metni paneldeki sürümden gelir.

## Güvenlik

- Zod ile girdi sınırı
- Aynı origin kontrolü ve hız sınırı
- Server action origin kontrolü
- CSP nonce, `frame-ancestors 'none'`, nosniff
- Denetim kaydı kişisel mesaj gövdesi tutmaz
- Dışa aktarma ve anonimleştirme yalnızca yöneticiye açıktır
- Webhook imzası için HMAC yardımcısı vardır; henüz bir webhook rotası yoktur
- Yinelenen form gönderimi `intake_submissions` anahtarıyla aynı dosyayı döndürür

## Fazlar

| Faz | Kapsam | Durum |
| --- | --- | --- |
| 0 | Mimari | Bu belge |
| 1 | Site, panel, auth, CRM, ön değerlendirme, şema | Bu sürüm |
| 2 | Telegram bot, webhook, CRM aktarımı | Yapılmadı |
| 3 | Instagram DM ve webhook | Yapılmadı |
| 4 | İçerik stüdyosu ve zamanlanmış yayın | Yapılmadı |
| 5 | Ödeme, randevu, hizmet satışı, bildirim | Yapılmadı |
| 6 | AI, mevzuat asistanı, raporlama | Yapılmadı |

Hizmet, randevu, içerik, ödeme ve otomasyon tabloları şemada durur ki sonraki fazlar yeni bir çekirdek açmasın. Panelleri boş ve bağlı değil durumunu gösterir.
