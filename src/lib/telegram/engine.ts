export type BotButton = { label: string; data: string };

export type BotReply = { text: string; buttons: BotButton[][] };

export type BotStep = "idle" | "country" | "ce" | "experience" | "german" | "name" | "confirm" | "verify";

export type PrecheckDraft = {
  country?: "TR" | "DE" | "OTHER";
  ce?: "yes" | "no";
  experience?: "none" | "y1_3" | "y5_plus";
  german?: "none" | "A1" | "B1";
  name?: string;
  pendingCode?: string;
};

export type BotEffect =
  | { type: "none" }
  | { type: "handoff" }
  | { type: "lead"; draft: PrecheckDraft }
  | { type: "track"; code: string; verifier: string };

export type TurnInput = {
  text: string;
  callback: string | null;
  media: boolean;
  step: BotStep;
  draft: PrecheckDraft;
  welcomeEnabled: boolean;
  services: string[];
  faqs: Array<{ question: string; answer: string }>;
  contactUrl: string | null;
};

export type TurnResult = {
  replies: BotReply[];
  step: BotStep;
  draft: PrecheckDraft;
  effect: BotEffect;
  category: string;
};

const WELCOME =
  "Merhaba! ROTA DE'ye hoş geldin.\n\nAlmanya'da şoförlük hedefin için sana yardımcı olabiliriz.\n\nİstersen ücretsiz ön değerlendirme oluşturabilir, Almanya'daki çalışma süreci hakkında bilgi alabilir veya ekibimizle görüşebilirsin.";

const MENU: BotButton[][] = [
  [{ label: "Ücretsiz ön değerlendirme", data: "precheck" }],
  [{ label: "Almanya'da şoförlük", data: "germany" }],
  [
    { label: "Başvurumu takip et", data: "track" },
    { label: "Destek ekibiyle görüş", data: "human" },
  ],
];

const CALLBACK_LABELS: Record<string, string> = {
  precheck: "Ücretsiz ön değerlendirme",
  germany: "Almanya'da şoförlük",
  track: "Başvurumu takip et",
  services: "Hizmetler",
  faq: "Sorular",
  contact: "İletişim",
  human: "Destek ekibiyle görüş",
  menu: "Menü",
  "c:TR": "Türkiye",
  "c:DE": "Almanya",
  "c:OTHER": "Başka",
  "ce:yes": "Evet",
  "ce:no": "Hayır",
  "ex:none": "Tecrübe yok",
  "ex:y1_3": "1–3 yıl",
  "ex:y5_plus": "5+ yıl",
  "de:none": "Almanca yok",
  "de:A": "Almanca A",
  "de:B": "Almanca B veya üzeri",
  "name:skip": "Adı atla",
  "ok:yes": "Kaydı aç",
};

export function labelForCallback(data: string): string {
  return CALLBACK_LABELS[data] ?? data;
}

const STEPS = new Set<BotStep>(["idle", "country", "ce", "experience", "german", "name", "confirm", "verify"]);

function reply(text: string, buttons: BotButton[][] = MENU): BotReply {
  return { text: text.slice(0, 900), buttons };
}

function idle(text: string, category: string, welcomeEnabled: boolean): TurnResult {
  return {
    replies: [reply(welcomeEnabled ? text : `Otomatik karşılama kapalı. ${text}`)],
    step: "idle",
    draft: {},
    effect: { type: "none" },
    category,
  };
}

function commandOf(text: string): string | null {
  const match = text.trim().match(/^\/([a-z]+)(?:@[\w_]+)?(?:\s|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function countryLabel(value: PrecheckDraft["country"]): string {
  if (value === "TR") return "Türkiye";
  if (value === "DE") return "Almanya";
  if (value === "OTHER") return "Başka ülke";
  return "—";
}

export function buttonsForStep(step: BotStep): BotButton[][] {
  if (step === "country") {
    return [
      [
        { label: "Türkiye", data: "c:TR" },
        { label: "Almanya", data: "c:DE" },
      ],
      [{ label: "Başka", data: "c:OTHER" }],
      [{ label: "Menü", data: "menu" }],
    ];
  }
  if (step === "ce") {
    return [
      [
        { label: "Evet", data: "ce:yes" },
        { label: "Hayır", data: "ce:no" },
      ],
      [{ label: "Menü", data: "menu" }],
    ];
  }
  if (step === "experience") {
    return [
      [
        { label: "Yok", data: "ex:none" },
        { label: "1–3 yıl", data: "ex:y1_3" },
        { label: "5+ yıl", data: "ex:y5_plus" },
      ],
      [{ label: "Menü", data: "menu" }],
    ];
  }
  if (step === "german") {
    return [
      [
        { label: "Yok", data: "de:none" },
        { label: "A", data: "de:A" },
        { label: "B veya üzeri", data: "de:B" },
      ],
      [{ label: "Menü", data: "menu" }],
    ];
  }
  if (step === "name") return [[{ label: "Adı atla", data: "name:skip" }], [{ label: "Menü", data: "menu" }]];
  if (step === "confirm") {
    return [
      [{ label: "Kaydı aç", data: "ok:yes" }],
      [{ label: "Vazgeç", data: "menu" }],
    ];
  }
  return MENU;
}

export function normalizeStep(value: unknown): BotStep {
  return typeof value === "string" && STEPS.has(value as BotStep) ? (value as BotStep) : "idle";
}

export function normalizeDraft(value: unknown): PrecheckDraft {
  if (!value || typeof value !== "object") return {};
  const row = value as Record<string, unknown>;
  const draft: PrecheckDraft = {};
  if (row.country === "TR" || row.country === "DE" || row.country === "OTHER") draft.country = row.country;
  if (row.ce === "yes" || row.ce === "no") draft.ce = row.ce;
  if (row.experience === "none" || row.experience === "y1_3" || row.experience === "y5_plus") draft.experience = row.experience;
  if (row.german === "none" || row.german === "A1" || row.german === "B1") draft.german = row.german;
  if (typeof row.name === "string" && row.name.trim().length >= 2 && row.name.trim().length <= 80) {
    draft.name = row.name.trim();
  }
  if (typeof row.pendingCode === "string" && /^(ROTA-\d{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}|RD-\d{4}-\d{5})$/.test(row.pendingCode)) {
    draft.pendingCode = row.pendingCode;
  }
  return draft;
}

function servicesReply(names: string[]): TurnResult {
  const list = names.slice(0, 5);
  const text = list.length
    ? `Yayımlanan hizmetler: ${list.join(", ")}. Ücret bu sohbette kesinleşmez.`
    : "Yayımlanmış ücretli hizmet yok.";
  return idle(text, "services", true);
}

function faqReply(faqs: TurnInput["faqs"]): TurnResult {
  const builtin = [
    "Vize veya iş garantisi yok.",
    "Kimlik ve pasaport istenmez.",
    "Telefon numaranız zorunlu değil. Kişisel numara da yayımlanmaz.",
  ];
  const extra = faqs.slice(0, 3).map((item) => `${item.question} ${item.answer}`.slice(0, 180));
  return idle([...builtin, ...extra].join(" "), "faq", true);
}

function contactReply(contactUrl: string | null): TurnResult {
  const form = contactUrl ? ` Form: ${contactUrl}` : "";
  return idle(`Kişisel telefon yayımlanmaz. Bu sohbet yeterlidir.${form}`, "contact", true);
}

function beginPrecheck(): TurnResult {
  return {
    replies: [
      reply("Hangi ülkedesiniz? Telefon istenmez. Bu bir onay değildir.", [
        [
          { label: "Türkiye", data: "c:TR" },
          { label: "Almanya", data: "c:DE" },
        ],
        [{ label: "Başka", data: "c:OTHER" }],
        [{ label: "Menü", data: "menu" }],
      ]),
    ],
    step: "country",
    draft: {},
    effect: { type: "none" },
    category: "precheck",
  };
}

function confirm(draft: PrecheckDraft): TurnResult {
  const name = draft.name || "İsimsiz";
  return {
    replies: [
      reply(
        `${name}, ${countryLabel(draft.country)}, CE ${draft.ce === "yes" ? "var" : "yok"}. Kayıt bir vize veya iş onayı değildir.`,
        [
          [{ label: "Kaydı aç", data: "ok:yes" }],
          [{ label: "Vazgeç", data: "menu" }],
        ],
      ),
    ],
    step: "confirm",
    draft,
    effect: { type: "none" },
    category: "precheck",
  };
}

export function takeTurn(input: TurnInput): TurnResult {
  const step = normalizeStep(input.step);
  const draft = normalizeDraft(input.draft);
  const callback = input.callback?.trim() || null;
  const command = commandOf(input.text);

  if (input.media && !callback && !command) {
    return idle("Fotoğraf ve belge alınmaz.", "media", input.welcomeEnabled);
  }

  const action = callback || command;
  if (action === "start" || action === "help" || action === "menu") {
    return idle(action === "start" ? WELCOME : "Menüden seçin. Telefon istenmez.", "menu", action === "start" ? input.welcomeEnabled : true);
  }
  if (action === "germany") {
    return idle(
      "Almanya'da şoförlük sayfası sitededir. § 24a BeschV bir otomatik hak doğurmaz. SRC3, Alman FQN belgesinin yerine geçmez. Vize kararını yetkili makam verir.",
      "germany",
      true,
    );
  }
  if (action === "track") {
    return idle("Başvuru kodunu yaz. Ardından başvuruda kullandığın e-posta veya telefon istenir. Başkasının dosyası gösterilmez.", "track", true);
  }
  if (action === "services") return servicesReply(input.services);
  if (action === "faq") return faqReply(input.faqs);
  if (action === "contact") return contactReply(input.contactUrl);
  if (action === "human") {
    return {
      replies: [reply("Danışmana iletildi. Telefon hattı yok, yazışma bu sohbetten sürer.")],
      step: "idle",
      draft: {},
      effect: { type: "handoff" },
      category: "handoff",
    };
  }
  if (action === "precheck") return beginPrecheck();

  if (step === "country" && (callback === "c:TR" || callback === "c:DE" || callback === "c:OTHER")) {
    const country = callback.slice(2) as PrecheckDraft["country"];
    return {
      replies: [
        reply("CE ehliyetiniz var mı?", [
          [
            { label: "Evet", data: "ce:yes" },
            { label: "Hayır", data: "ce:no" },
          ],
          [{ label: "Menü", data: "menu" }],
        ]),
      ],
      step: "ce",
      draft: { country },
      effect: { type: "none" },
      category: "precheck",
    };
  }

  if (step === "ce" && (callback === "ce:yes" || callback === "ce:no")) {
    return {
      replies: [
        reply("Tır tecrübeniz?", [
          [
            { label: "Yok", data: "ex:none" },
            { label: "1–3 yıl", data: "ex:y1_3" },
            { label: "5+ yıl", data: "ex:y5_plus" },
          ],
          [{ label: "Menü", data: "menu" }],
        ]),
      ],
      step: "experience",
      draft: { ...draft, ce: callback === "ce:yes" ? "yes" : "no" },
      effect: { type: "none" },
      category: "precheck",
    };
  }

  if (step === "experience" && (callback === "ex:none" || callback === "ex:y1_3" || callback === "ex:y5_plus")) {
    const experience = callback.slice(3) as PrecheckDraft["experience"];
    return {
      replies: [
        reply("Almanca?", [
          [
            { label: "Yok", data: "de:none" },
            { label: "A", data: "de:A" },
            { label: "B veya üzeri", data: "de:B" },
          ],
          [{ label: "Menü", data: "menu" }],
        ]),
      ],
      step: "german",
      draft: { ...draft, experience },
      effect: { type: "none" },
      category: "precheck",
    };
  }

  if (step === "german" && (callback === "de:none" || callback === "de:A" || callback === "de:B")) {
    const german = callback === "de:none" ? "none" : callback === "de:A" ? "A1" : "B1";
    return {
      replies: [
        reply("Adınızı yazın. Telefon yazmayın.", [[{ label: "Adı atla", data: "name:skip" }], [{ label: "Menü", data: "menu" }]]),
      ],
      step: "name",
      draft: { ...draft, german },
      effect: { type: "none" },
      category: "precheck",
    };
  }

  if (step === "name" && callback === "name:skip") {
    return confirm({ ...draft, name: "Telegram adayı" });
  }

  if (step === "name" && !command && !callback) {
    const name = input.text.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 80) {
      return {
        replies: [reply("Ad çok kısa veya uzun. Yeniden yazın ya da atlayın.", [[{ label: "Adı atla", data: "name:skip" }]])],
        step: "name",
        draft,
        effect: { type: "none" },
        category: "precheck",
      };
    }
    return confirm({ ...draft, name });
  }

  if (step === "confirm" && callback === "ok:yes") {
    const ready = normalizeDraft(draft);
    return {
      replies: [reply("Kayıt alındı. Bu bir vize, oturum veya iş onayı değildir.")],
      step: "idle",
      draft: {},
      effect: { type: "lead", draft: ready },
      category: "precheck",
    };
  }

  if (step === "verify") {
    const pending = draft.pendingCode;
    if (!pending || callback === "menu" || command === "menu" || command === "start") {
      return idle("Takip iptal edildi. Menüden yeniden seçebilirsin.", "track", true);
    }
    const verifier = input.text.trim();
    if (verifier.length < 5) {
      return {
        replies: [reply("E-posta veya telefon eksik. Başvuruda yazdığın bilgiyi gönder.", [[{ label: "Menü", data: "menu" }]])],
        step: "verify",
        draft,
        effect: { type: "none" },
        category: "track",
      };
    }
    return {
      replies: [reply("Kontrol ediliyor.")],
      step: "idle",
      draft: {},
      effect: { type: "track", code: pending, verifier },
      category: "track",
    };
  }

  if (step !== "idle") {
    return {
      replies: [reply("Düğmeyi kullanın.")],
      step,
      draft,
      effect: { type: "none" },
      category: "precheck",
    };
  }

  const code = input.text.trim().toUpperCase();
  if (/^(ROTA-\d{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}|RD-\d{4}-\d{5})$/.test(code)) {
    return {
      replies: [reply("Başvuru kodu alındı. Şimdi başvuruda yazdığın e-posta adresini veya telefon numarasını yaz. Yalnızca eşleşirse durum gösterilir.", [[{ label: "Menü", data: "menu" }]])],
      step: "verify",
      draft: { pendingCode: code },
      effect: { type: "none" },
      category: "track",
    };
  }

  return idle("Bunu otomatik açamıyorum. Menüden seçin veya insan isteyin.", "unmatched", input.welcomeEnabled);
}
