import { createHash, timingSafeEqual } from "node:crypto";

export const TRACKER_STAGES = [
  "received",
  "reviewing",
  "contact",
  "started",
  "matching",
  "completed",
  "missing_info",
  "awaiting_reply",
  "closed",
] as const;

export type TrackerStage = (typeof TRACKER_STAGES)[number];

export const TRACKER_LABEL: Record<TrackerStage, string> = {
  received: "Başvuru Alındı",
  reviewing: "Başvurunuz İnceleniyor",
  contact: "İletişim Aşaması",
  started: "Süreç Başlatıldı",
  matching: "İşveren Eşleştirme Aşaması",
  completed: "Süreç Tamamlandı",
  missing_info: "Ek bilgi bekleniyor",
  awaiting_reply: "Adaydan yanıt bekleniyor",
  closed: "Başvuru kapatıldı",
};

export const TRACKER_DEFAULT: Record<TrackerStage, string> = {
  received: "Başvurunuz ROTA DE sistemine başarıyla kaydedilmiştir. Destek ekibimiz sizinle en kısa sürede iletişime geçecektir.",
  reviewing: "Destek ekibimiz başvurunuzu incelemektedir. Bilgileriniz değerlendirildikten sonra sizinle iletişime geçilecektir.",
  contact: "Başvurunuzla ilgili değerlendirme tamamlanmıştır. Destek ekibimiz sizinle iletişim kuracaktır.",
  started: "Almanya'da şoförlük yolculuğunuz için süreç başlatılmıştır. Bundan sonraki adımlar destek ekibimiz tarafından sizinle birlikte yürütülecektir.",
  matching: "Profiliniz uygun işveren seçenekleri açısından değerlendirilmektedir. Uygun fırsatlar oluştuğunda sizinle iletişime geçilecektir.",
  completed: "ROTA DE ile yürüttüğünüz süreç tamamlanmıştır. Almanya yolculuğunuzda başarılar dileriz!",
  missing_info: "Başvurunuz için ek bilgi gerekiyor. Destek ekibimiz sizinle iletişime geçecektir.",
  awaiting_reply: "Başvurunuzla ilgili sizden bir yanıt bekleniyor. Size ulaştığımız kanalı kontrol edebilirsiniz.",
  closed: "Bu başvuru kapatılmıştır. Yeni bir değerlendirme için yeniden başvurabilirsiniz.",
};

export function isTrackerStage(value: string): value is TrackerStage {
  return (TRACKER_STAGES as readonly string[]).includes(value);
}

function same(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export function verifierMatches(
  record: { email: string | null; phone: string | null; telegram?: string | null },
  verifier: string,
): boolean {
  const raw = verifier.trim();
  if (raw.length < 5 || raw.length > 180) return false;
  const email = (record.email ?? "").trim().toLowerCase();
  const phone = (record.phone ?? "").replace(/\D/g, "");
  const telegram = (record.telegram ?? "").replace(/^@/, "").toLowerCase();
  const givenEmail = raw.toLowerCase();
  const givenPhone = raw.replace(/\D/g, "");
  const givenTelegram = raw.replace(/^@/, "").toLowerCase();
  const emailOk = email.includes("@") && same(givenEmail, email);
  const phoneOk = phone.length >= 8 && givenPhone.length >= 8 && same(givenPhone, phone);
  const telegramOk = telegram.length >= 5 && same(givenTelegram, telegram);
  return emailOk || phoneOk || telegramOk;
}
