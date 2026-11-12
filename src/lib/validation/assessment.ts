import { z } from "zod";

export const residenceCountries = ["TR", "DE", "EU_EEA_OTHER", "OTHER"] as const;
export const ageRanges = ["18_20", "21_24", "25_34", "35_44", "45_54", "55_plus", "undisclosed"] as const;
export const licenceClasses = ["B", "C", "C1", "CE", "C1E", "D", "DE", "OTHER"] as const;
export const experienceRanges = ["none", "under_1", "y1_3", "y3_5", "y5_plus"] as const;
export const germanLevels = ["none", "A1", "A2", "B1", "B2", "C1_plus"] as const;
export const intents = ["work_in_germany", "change_job", "both", "unsure"] as const;
export const contactPreferences = ["email", "telegram", "instagram", "phone"] as const;
export const availabilityWindows = ["now", "m1_3", "m3_6", "later"] as const;
export const triStates = ["yes", "no", "unknown"] as const;

const optionalHandle = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((value) => (value ? value : undefined));

export const assessmentSchema = z
  .object({
    residenceCountry: z.enum(residenceCountries),
    residenceDetail: optionalHandle,
    ageRange: z.enum(ageRanges),
    licenceClasses: z.array(z.enum(licenceClasses)).min(1).max(8),
    licenceCountry: z.enum(residenceCountries),
    licenceCountryDetail: optionalHandle,
    hasCe: z.enum(["yes", "no"]),
    euEeaLicence: z.enum(triStates),
    code95: z.enum(triStates),
    experienceRange: z.enum(experienceRanges),
    germanLevel: z.enum(germanLevels),
    intent: z.enum(intents),
    fullName: z.string().trim().min(3).max(120),
    email: z.email().max(180),
    contactPreference: z.enum(contactPreferences),
    phone: optionalHandle,
    telegramHandle: optionalHandle,
    instagramHandle: optionalHandle,
    consent: z.literal(true),
    disclaimerAck: z.literal(true),
    idempotencyKey: z.string().trim().min(8).max(80),
    companyWebsite: z.string().max(200).optional(),
  })
  .superRefine((value, context) => {
    if (value.residenceCountry === "OTHER" && !value.residenceDetail) {
      context.addIssue({ code: "custom", path: ["residenceDetail"], message: "required" });
    }
    if (value.licenceCountry === "OTHER" && !value.licenceCountryDetail) {
      context.addIssue({ code: "custom", path: ["licenceCountryDetail"], message: "required" });
    }
  });

export type AssessmentInput = z.infer<typeof assessmentSchema>;

const phoneField = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15;
  }, "phone");

export const journeyChannels = ["phone", "email", "telegram"] as const;

const handleField = z
  .string()
  .trim()
  .max(40)
  .optional()
  .refine((value) => !value || /^@?[A-Za-z0-9_]{5,32}$/.test(value), "telegram");

export const journeySchema = z
  .object({
    ce: z.enum(["have", "planning"]),
    src3: z.enum(["have", "planning", "info"]),
    experience: z.enum(experienceRanges),
    german: z.enum(["none", "beginner", "mid", "good"]),
    family: z.enum(["alone", "spouse", "family"]),
    residence: z.enum(residenceCountries).default("TR"),
    availability: z.enum(availabilityWindows).default("later"),
    spouseGerman: z.enum(["yes", "no", "unknown"]).optional(),
    childrenAges: z.string().trim().max(80).optional(),
    fullName: z.string().trim().min(3).max(120),
    phone: z.string().trim().max(20).optional(),
    email: z.union([z.literal(""), z.email().max(180)]).optional(),
    city: z.string().trim().min(2).max(80),
    channels: z.array(z.enum(journeyChannels)).max(3).optional(),
    contactPreference: z.enum(journeyChannels).optional(),
    telegramHandle: handleField,
    note: z.string().trim().max(500).optional(),
    marketingOptIn: z.boolean(),
    consent: z.literal(true),
    disclaimerAck: z.literal(true),
    idempotencyKey: z.string().trim().min(8).max(80),
    companyWebsite: z.string().max(200).optional(),
  })
  .superRefine((value, context) => {
    if (value.family !== "alone" && !value.spouseGerman) {
      context.addIssue({ code: "custom", path: ["spouseGerman"], message: "required" });
    }
    const modern = Boolean(value.channels?.length);
    const channels = modern ? (value.channels ?? []) : value.contactPreference ? [value.contactPreference] : [];
    if (channels.length === 0) {
      context.addIssue({ code: "custom", path: ["channels"], message: "required" });
    }
    const phoneRequired = channels.includes("phone") || !modern;
    if (phoneRequired && !phoneField.safeParse(value.phone ?? "").success) {
      context.addIssue({ code: "custom", path: ["phone"], message: "phone" });
    }
    if (channels.includes("email") && !value.email?.includes("@")) {
      context.addIssue({ code: "custom", path: ["email"], message: "email" });
    }
    if (modern && channels.includes("telegram") && !/^@?[A-Za-z0-9_]{5,32}$/.test(value.telegramHandle ?? "")) {
      context.addIssue({ code: "custom", path: ["telegramHandle"], message: "telegram" });
    }
  });

export type JourneyInput = z.infer<typeof journeySchema>;

export const contactSchema = z
  .object({
    fullName: z.string().trim().min(3).max(120),
    email: z.union([z.literal(""), z.email().max(180)]).optional(),
    message: z.string().trim().min(10).max(4000),
    contactPreference: z.enum(contactPreferences),
    channels: z.array(z.enum(journeyChannels)).max(3).optional(),
    phone: optionalHandle,
    telegramHandle: optionalHandle,
    consent: z.literal(true),
    idempotencyKey: z.string().trim().min(8).max(80),
    companyWebsite: z.string().max(200).optional(),
  })
  .superRefine((value, context) => {
    const channels = value.channels?.length ? value.channels : [value.contactPreference];
    if (channels.includes("phone") && !phoneField.safeParse(value.phone ?? "").success) {
      context.addIssue({ code: "custom", path: ["phone"], message: "phone" });
    }
    if (channels.includes("email") && !value.email?.includes("@")) {
      context.addIssue({ code: "custom", path: ["email"], message: "email" });
    }
    if (channels.includes("telegram") && !/^@?[A-Za-z0-9_]{5,32}$/.test(value.telegramHandle ?? "")) {
      context.addIssue({ code: "custom", path: ["telegramHandle"], message: "telegram" });
    }
  });

export const trackLookupSchema = z.object({
  code: z.string().trim().min(8).max(40),
  verifier: z.string().trim().min(5).max(180),
  companyWebsite: z.string().max(200).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const deletionSchema = z.object({
  email: z.email().max(180),
  consent: z.literal(true),
});

export const manualLeadSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.union([z.literal(""), z.email().max(180)]).optional(),
  contactPreference: z.enum([...contactPreferences, "unspecified"] as const).default("unspecified"),
  country: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const companySchema = z.object({
  legalName: z.string().trim().max(180),
  legalForm: z.string().trim().max(80),
  addressLine: z.string().trim().max(180),
  postalCode: z.string().trim().max(20),
  city: z.string().trim().max(80),
  country: z.string().trim().max(80),
  email: z.union([z.literal(""), z.email().max(180)]),
  phone: z.string().trim().max(40),
  registerCourt: z.string().trim().max(120),
  registerNumber: z.string().trim().max(80),
  vatId: z.string().trim().max(40),
  responsiblePerson: z.string().trim().max(120),
});

export type CompanyProfile = z.infer<typeof companySchema>;

export const retentionSchema = z.object({
  leadDays: z.coerce.number().int().min(30).max(3650),
  auditDays: z.coerce.number().int().min(30).max(3650),
});

export const legislationSchema = z.object({
  versionLabel: z.string().trim().min(2).max(40),
  reviewStatus: z.enum(["unverified", "internal_draft", "reviewed_internally"]),
  summaryTr: z.string().trim().min(20).max(4000),
  summaryDe: z.string().trim().min(20).max(4000),
  abs1LabelTr: z.string().trim().min(3).max(160),
  abs1LabelDe: z.string().trim().min(3).max(160),
  abs1NoteTr: z.string().trim().min(20).max(4000),
  abs1NoteDe: z.string().trim().min(20).max(4000),
  abs2LabelTr: z.string().trim().min(3).max(160),
  abs2LabelDe: z.string().trim().min(3).max(160),
  abs2NoteTr: z.string().trim().min(20).max(4000),
  abs2NoteDe: z.string().trim().min(20).max(4000),
});

export const faqSchema = z.object({
  locale: z.enum(["tr", "de"]),
  question: z.string().trim().min(5).max(240),
  answer: z.string().trim().min(5).max(4000),
  published: z.boolean(),
  sourceNote: z.string().trim().max(240).optional(),
});

export function emptyCompany(): CompanyProfile {
  return {
    legalName: "",
    legalForm: "",
    addressLine: "",
    postalCode: "",
    city: "",
    country: "",
    email: "",
    phone: "",
    registerCourt: "",
    registerNumber: "",
    vatId: "",
    responsiblePerson: "",
  };
}

export function companyReady(company: CompanyProfile): boolean {
  return Boolean(
    company.legalName &&
      company.addressLine &&
      company.postalCode &&
      company.city &&
      company.country &&
      company.email &&
      company.responsiblePerson,
  );
}
