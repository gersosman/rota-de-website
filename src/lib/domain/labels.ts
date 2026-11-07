export const LEAD_STATUSES = [
  "NEW",
  "PRE_QUALIFICATION",
  "NEEDS_REVIEW",
  "CONTACTED",
  "CONSULTATION_PENDING",
  "PAYMENT_PENDING",
  "PAID",
  "ACTIVE",
  "COMPLETED",
  "CLOSED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SCENARIO_HINTS = [
  "BESCHV_24A_ABS1_RELATED",
  "BESCHV_24A_ABS2_RELATED",
  "INSUFFICIENT_INFORMATION",
  "NEEDS_REVIEW",
] as const;

export type ScenarioHint = (typeof SCENARIO_HINTS)[number];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Yeni",
  PRE_QUALIFICATION: "Ön eleme",
  NEEDS_REVIEW: "İnceleme bekliyor",
  CONTACTED: "İletişim kuruldu",
  CONSULTATION_PENDING: "Görüşme bekliyor",
  PAYMENT_PENDING: "Ödeme bekliyor",
  PAID: "Ödendi",
  ACTIVE: "Aktif",
  COMPLETED: "Tamamlandı",
  CLOSED: "Kapandı",
};

export const SCENARIO_LABEL: Record<ScenarioHint, string> = {
  BESCHV_24A_ABS1_RELATED: "§ 24a Abs. 1 inceleme izi",
  BESCHV_24A_ABS2_RELATED: "§ 24a Abs. 2 inceleme izi",
  INSUFFICIENT_INFORMATION: "Bilgi eksik",
  NEEDS_REVIEW: "Değerlendirme bekliyor",
};

export const AUTOMATION_LABEL: Record<string, string> = {
  instagram_welcome: "Instagram otomatik karşılama",
  telegram_welcome: "Telegram otomatik karşılama",
  ai_reply: "AI otomatik cevap",
  new_lead_notice: "Yeni aday bildirimi",
  payment_notice: "Ödeme bildirimi",
  appointment_reminder: "Randevu hatırlatması",
  follow_up: "Takip mesajı",
  content_publish: "İçerik yayınlama",
  failed_job_notice: "Başarısız görev bildirimi",
};

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}
