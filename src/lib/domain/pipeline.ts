export const PIPELINE_STAGES = [
  "new",
  "precheck",
  "missing_info",
  "suitable",
  "matched",
  "interview",
  "offer",
  "contract",
  "official",
  "visa_pending",
  "visa_approved",
  "entered",
  "started",
  "completed",
  "closed",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_LABEL: Record<PipelineStage, string> = {
  new: "Yeni başvuru",
  precheck: "Ön değerlendirme",
  missing_info: "Eksik bilgi bekleniyor",
  suitable: "Uygun aday",
  matched: "İşveren eşleştirmesi",
  interview: "İş görüşmesi",
  offer: "İş teklifi",
  contract: "İş sözleşmesi",
  official: "Resmi başvuru süreci",
  visa_pending: "Vize sonucu bekleniyor",
  visa_approved: "Vize onaylandı",
  entered: "Almanya'ya giriş",
  started: "İşe başladı",
  completed: "Süreç tamamlandı",
  closed: "Olumsuz / kapatıldı",
};

export function isPipelineStage(value: string): value is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(value);
}

export function experienceLabel(value: string | null | undefined): string {
  if (value === "none") return "Yok";
  if (value === "under_1") return "1 yıldan az";
  if (value === "y1_3") return "1–3 yıl";
  if (value === "y3_5") return "3–5 yıl";
  if (value === "y5_plus") return "5+ yıl";
  return "Belirtilmedi";
}

export function ceLabel(value: string | null | undefined): string {
  if (value === "have" || value === "yes") return "Var";
  if (value === "planning") return "Almayı planlıyor";
  if (value === "no") return "Hayır";
  if (value === "none") return "Yok";
  return "Belirtilmedi";
}

export function src3Label(value: string | null | undefined): string {
  if (value === "have") return "Var";
  if (value === "planning") return "Hedefliyor";
  if (value === "info") return "Bilgi istedi";
  return "Belirtilmedi";
}
