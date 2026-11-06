import type { LeadStatus, ScenarioHint } from "@/lib/domain/labels";

export type Tri = "yes" | "no" | "unknown";

export type AssessmentFacts = {
  residenceCountry?: string;
  ageRange?: string;
  licenceClasses: string[];
  licenceCountry?: string;
  hasCe?: "yes" | "no";
  euEeaLicence?: Tri;
  code95?: Tri;
  experienceRange?: string;
  germanLevel?: string;
  intent?: string;
};

export type Classification = {
  hint: ScenarioHint;
  leadStatus: Extract<LeadStatus, "PRE_QUALIFICATION" | "NEEDS_REVIEW">;
  reason: string;
  missing: string[];
};

const REQUIRED: Array<[keyof AssessmentFacts | "licenceClasses", string]> = [
  ["residenceCountry", "residenceCountry"],
  ["ageRange", "ageRange"],
  ["licenceClasses", "licenceClasses"],
  ["licenceCountry", "licenceCountry"],
  ["hasCe", "hasCe"],
  ["euEeaLicence", "euEeaLicence"],
  ["code95", "code95"],
  ["experienceRange", "experienceRange"],
  ["germanLevel", "germanLevel"],
  ["intent", "intent"],
];

function hasProfessionalLicence(facts: AssessmentFacts): boolean {
  if (facts.hasCe === "yes") return true;
  return facts.licenceClasses.some((item) => item === "C" || item === "C1" || item === "CE" || item === "C1E");
}

export function classifyAssessment(facts: AssessmentFacts): Classification {
  const missing = REQUIRED.filter(([key]) => {
    if (key === "licenceClasses") return facts.licenceClasses.length === 0 && !facts.hasCe;
    const value = facts[key as keyof AssessmentFacts];
    return value === undefined || value === "";
  }).map(([, label]) => label);

  if (missing.length > 0) {
    return {
      hint: "INSUFFICIENT_INFORMATION",
      leadStatus: "NEEDS_REVIEW",
      reason:
        "Zorunlu ön bilgiler eksik. Dosya insan incelemesine alındı. Bu sonuç vize, çalışma izni veya iş kararı değildir.",
      missing,
    };
  }

  const professional = hasProfessionalLicence(facts);

  if (facts.euEeaLicence === "yes" && facts.code95 === "yes" && professional) {
    return {
      hint: "BESCHV_24A_ABS1_RELATED",
      leadStatus: "PRE_QUALIFICATION",
      reason:
        "Bildirilen olgular AB/AEA sürücü belgesi, Code 95 ve meslekî tır sınıfı içeriyor. Dosya § 24a Abs. 1 ile ilişkili insan incelemesine ayrıldı. Uygunluk kararı verilmedi.",
      missing: [],
    };
  }

  if (professional && facts.code95 === "no") {
    return {
      hint: "BESCHV_24A_ABS2_RELATED",
      leadStatus: "PRE_QUALIFICATION",
      reason:
        "Meslekî tır sınıfı bildirildi ve Code 95 olmadığı belirtildi. Dosya § 24a Abs. 2 ile ilişkili insan incelemesine ayrıldı. Uygunluk kararı verilmedi.",
      missing: [],
    };
  }

  return {
    hint: "NEEDS_REVIEW",
    leadStatus: "NEEDS_REVIEW",
    reason:
      "Bildirilen olgular tek bir senaryo izine ayrılmıyor veya bir cevap belirsiz. İnsan incelemesi gerekir. Uygunluk kararı verilmedi.",
    missing: [],
  };
}
