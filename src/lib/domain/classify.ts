import type { LeadStatus, ScenarioHint } from "@/lib/domain/labels";

export type Tri = "yes" | "no" | "unknown";
export type CeIntent = "have" | "planning";
export type Src3Answer = "have" | "planning" | "info";

export type AssessmentFacts = {
  residenceCountry?: string;
  residenceDetail?: string;
  ageRange?: string;
  licenceClasses?: string[];
  licenceCountry?: string;
  hasCe?: "yes" | "no";
  ceIntent?: CeIntent;
  src3?: Src3Answer;
  euEeaLicence?: Tri;
  code95?: Tri;
  experienceRange?: string;
  germanLevel?: string;
  intent?: string;
};

export type AskedField = keyof AssessmentFacts;

export type Classification = {
  hint: ScenarioHint;
  leadStatus: Extract<LeadStatus, "PRE_QUALIFICATION" | "NEEDS_REVIEW">;
  reason: string;
  missing: string[];
};

const FULL_ASKED: AskedField[] = [
  "residenceCountry",
  "ageRange",
  "licenceClasses",
  "licenceCountry",
  "hasCe",
  "euEeaLicence",
  "code95",
  "experienceRange",
  "germanLevel",
  "intent",
];

export const PRECHECK_ASKED: AskedField[] = ["residenceCountry", "ceIntent", "src3", "experienceRange"];

const LABEL: Record<AskedField, string> = {
  residenceCountry: "Yaşanılan ülke",
  residenceDetail: "Ülke adı",
  ageRange: "Yaş aralığı",
  licenceClasses: "Ehliyet sınıfı",
  licenceCountry: "Ehliyet ülkesi",
  hasCe: "CE ehliyeti",
  ceIntent: "CE ehliyeti",
  src3: "SRC3",
  euEeaLicence: "AB/AEA ehliyeti",
  code95: "Code 95",
  experienceRange: "Mesleki deneyim",
  germanLevel: "Almanca",
  intent: "Hedef",
};

function blank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function professional(facts: AssessmentFacts): boolean {
  if (facts.hasCe === "yes" || facts.ceIntent === "have") return true;
  return (facts.licenceClasses ?? []).some((item) => item === "C" || item === "C1" || item === "CE" || item === "C1E");
}

function missingFields(facts: AssessmentFacts, asked: readonly AskedField[]) {
  const missing: AskedField[] = [];
  for (const key of asked) {
    if (key === "licenceClasses") {
      const classes = facts.licenceClasses ?? [];
      if (classes.length === 0 && facts.hasCe !== "yes" && facts.hasCe !== "no" && !facts.ceIntent) missing.push(key);
      continue;
    }
    if (blank(facts[key])) missing.push(key);
  }
  if (asked.includes("residenceCountry") && facts.residenceCountry === "OTHER" && blank(facts.residenceDetail)) {
    missing.push("residenceDetail");
  }
  return missing;
}

export function classifyAssessment(
  facts: AssessmentFacts,
  options?: { asked?: readonly AskedField[] },
): Classification {
  const asked = options?.asked ?? FULL_ASKED;
  const missing = missingFields(facts, asked);

  if (missing.length > 0) {
    const names = missing.map((key) => LABEL[key]);
    return {
      hint: "INSUFFICIENT_INFORMATION",
      leadStatus: "NEEDS_REVIEW",
      reason: `Zorunlu ön bilgiler eksik: ${names.join(", ")}. Dosya değerlendirmeye alındı. Bu sonuç vize, çalışma izni veya iş kararı değildir.`,
      missing,
    };
  }

  const legalFactsKnown = facts.euEeaLicence !== undefined && facts.code95 !== undefined;
  if (legalFactsKnown && facts.euEeaLicence === "yes" && facts.code95 === "yes" && professional(facts)) {
    return {
      hint: "BESCHV_24A_ABS1_RELATED",
      leadStatus: "PRE_QUALIFICATION",
      reason:
        "Bildirilen olgular AB/AEA sürücü belgesi, Code 95 ve meslekî tır sınıfı içeriyor. Dosya § 24a Abs. 1 ile ilişkili değerlendirmeye ayrıldı. Uygunluk kararı verilmedi.",
      missing: [],
    };
  }

  if (legalFactsKnown && professional(facts) && facts.code95 === "no") {
    return {
      hint: "BESCHV_24A_ABS2_RELATED",
      leadStatus: "PRE_QUALIFICATION",
      reason:
        "Meslekî tır sınıfı bildirildi ve Code 95 olmadığı belirtildi. Dosya § 24a Abs. 2 ile ilişkili değerlendirmeye ayrıldı. Uygunluk kararı verilmedi.",
      missing: [],
    };
  }

  return {
    hint: "NEEDS_REVIEW",
    leadStatus: "NEEDS_REVIEW",
    reason: legalFactsKnown
      ? "Bildirilen olgular tek bir senaryo izine ayrılmıyor veya bir cevap belirsiz. Değerlendirme gerekir. Uygunluk kararı verilmedi."
      : "Sorulan cevaplar kayda geçti. Code 95 ve AB/AEA ehliyeti bu başvuruda sorulmadığı için tek bir yasal iz seçilmedi. SRC3, Code 95 veya FQN yerine geçmez. Değerlendirme gerekir. Uygunluk kararı verilmedi.",
    missing: [],
  };
}

export function classifyPrecheck(facts: AssessmentFacts): Classification {
  return classifyAssessment(facts, { asked: PRECHECK_ASKED });
}
