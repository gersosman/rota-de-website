export type WaButton = { id: string; title: string };

export type WaReply = { text: string; buttons: WaButton[] };

export type WaStep =
  | "idle"
  | "ce"
  | "src3"
  | "experience"
  | "german"
  | "family"
  | "spouse"
  | "children"
  | "name"
  | "city"
  | "confirm";

export type WaDraft = {
  ce?: "yes" | "plan";
  src3?: "have" | "plan" | "info";
  experience?: "under_1" | "y1_3" | "y3_5" | "y5_plus" | "none";
  german?: "none" | "start" | "mid" | "good";
  family?: "alone" | "spouse" | "family";
  spouse?: "yes" | "no" | "unknown";
  children?: string;
  name?: string;
  city?: string;
};

type Effect =
  | { type: "none" }
  | { type: "lead"; draft: WaDraft }
  | { type: "handoff" }
  | { type: "track"; code: string };

export type WaTurn = {
  replies: WaReply[];
  step: WaStep;
  draft: WaDraft;
  effect: Effect;
};

const MENU: WaButton[] = [
  { id: "precheck", title: "Ön değerlendirme" },
  { id: "info", title: "Süreç bilgisi" },
  { id: "track", title: "Başvuru takip" },
  { id: "human", title: "Yetkiliyle görüş" },
];

const WELCOME =
  "Merhaba! 👋\n\nROTA DE'ye hoş geldin.\n\nAlmanya'da şoförlük hedefin için sana yardımcı olabiliriz.\n\nBaşlamak için aşağıdan bir seçenek seçebilirsin.\n\nBu sohbetteki WhatsApp numaran, yalnızca bu ön görüşme için iletişim bilgisi olarak kullanılır. İstemezsen yazışmayı bırakabilirsin. Bu bir vize veya iş onayı değildir.";

function reply(text: string, buttons: WaButton[] = []): WaReply {
  return { text, buttons };
}

function menuTurn(step: WaStep, draft: WaDraft, extra?: string): WaTurn {
  return {
    step,
    draft,
    effect: { type: "none" },
    replies: [reply(extra ? `${extra}\n\n${WELCOME}` : WELCOME, MENU)],
  };
}

export function normalizeWaStep(value: string): WaStep {
  const steps: WaStep[] = ["idle", "ce", "src3", "experience", "german", "family", "spouse", "children", "name", "city", "confirm"];
  return steps.includes(value as WaStep) ? (value as WaStep) : "idle";
}

export function takeWhatsappTurn(input: {
  text: string;
  button: string | null;
  step: WaStep;
  draft: WaDraft;
  welcomeEnabled: boolean;
}): WaTurn {
  const text = input.text.trim();
  const button = input.button;
  const draft = { ...input.draft };
  const file = text.toUpperCase().match(/RD-\d{4}-\d{5}/)?.[0];

  if (button === "human" || /^yetkili/i.test(text)) {
    return {
      step: "idle",
      draft,
      effect: { type: "handoff" },
      replies: [reply("Ekip bu yazışmayı devralacak. Otomatik cevap durdu. Kişisel bir numara paylaşılmaz.")],
    };
  }
  if (button === "menu" || text === "/start") return withWelcome(menuTurn("idle", {}), input.welcomeEnabled);
  if (button === "info" || text === "/help") {
    return {
      step: "idle",
      draft,
      effect: { type: "none" },
      replies: [
        reply(
          "İlk adım ön değerlendirmedir. Evrak yüklemesi istenmez. Sonuç bir dosya numarasıdır. Vize, oturum veya iş garantisi yoktur.",
          MENU,
        ),
      ],
    };
  }
  if (button === "track" || file) {
    if (!file) {
      return {
        step: input.step,
        draft,
        effect: { type: "none" },
        replies: [reply("Dosya numaranı yaz. Örnek: RD-2026-00001")],
      };
    }
    return { step: "idle", draft, effect: { type: "track", code: file }, replies: [] };
  }
  if (button === "precheck") return askCe(draft);

  if (input.step === "ce" && (button === "ce:yes" || button === "ce:plan")) {
    draft.ce = button === "ce:yes" ? "yes" : "plan";
    return askSrc(draft);
  }
  if (input.step === "src3" && (button === "src:have" || button === "src:plan" || button === "src:info")) {
    draft.src3 = button === "src:have" ? "have" : button === "src:plan" ? "plan" : "info";
    return askExperience(draft);
  }
  if (input.step === "experience" && button?.startsWith("ex:")) {
    const value = button.slice(3);
    if (value === "under_1" || value === "y1_3" || value === "y3_5" || value === "y5_plus" || value === "none") {
      draft.experience = value;
      return askGerman(draft);
    }
  }
  if (input.step === "german" && (button === "de:none" || button === "de:start" || button === "de:mid" || button === "de:good")) {
    draft.german = button.slice(3) as WaDraft["german"];
    return askFamily(draft);
  }
  if (input.step === "family" && (button === "fa:alone" || button === "fa:spouse" || button === "fa:family")) {
    draft.family = button === "fa:alone" ? "alone" : button === "fa:spouse" ? "spouse" : "family";
    if (draft.family === "alone") return askName(draft);
    return askSpouse(draft);
  }
  if (input.step === "spouse" && (button === "sp:yes" || button === "sp:no" || button === "sp:unknown")) {
    draft.spouse = button === "sp:yes" ? "yes" : button === "sp:no" ? "no" : "unknown";
    if (draft.family === "family") return askChildren(draft);
    return askName(draft);
  }
  if (input.step === "children" && (button === "ch:skip" || text)) {
    draft.children = button === "ch:skip" ? "" : text.slice(0, 80);
    return askName(draft);
  }
  if (input.step === "name" && text.length >= 2 && text.length <= 80) {
    draft.name = text;
    return askCity(draft);
  }
  if (input.step === "city" && text.length >= 2 && text.length <= 80) {
    draft.city = text;
    return {
      step: "confirm",
      draft,
      effect: { type: "none" },
      replies: [
        reply(
          `${draft.name}, ${draft.city}. Kayıt bir vize veya iş onayı değildir. Numaran bu sohbetten alınır, yeniden sorulmaz.`,
          [
            { id: "ok:yes", title: "Kaydı aç" },
            { id: "menu", title: "Vazgeç" },
          ],
        ),
      ],
    };
  }
  if (input.step === "confirm" && button === "ok:yes" && draft.name && draft.city && draft.ce && draft.src3) {
    return {
      step: "idle",
      draft: {},
      effect: { type: "lead", draft },
      replies: [reply("Kayıt alındı. Bu bir vize, oturum veya iş onayı değildir.", MENU)],
    };
  }
  if (input.step === "idle") return withWelcome(menuTurn("idle", draft), input.welcomeEnabled);
  return {
    step: input.step,
    draft,
    effect: { type: "none" },
    replies: [reply("Seçeneklerden birini kullan. İstediğin an yetkiliye geçebilirsin.", [{ id: "human", title: "Yetkiliyle görüş" }])],
  };
}

function withWelcome(turn: WaTurn, enabled: boolean): WaTurn {
  if (enabled || turn.replies.length === 0) return turn;
  return { ...turn, replies: [{ ...turn.replies[0], text: `Otomatik karşılama kapalı.\n\n${turn.replies[0].text}` }, ...turn.replies.slice(1)] };
}

function askCe(draft: WaDraft): WaTurn {
  return {
    step: "ce",
    draft,
    effect: { type: "none" },
    replies: [reply("CE ehliyetin var mı?", [{ id: "ce:yes", title: "CE var" }, { id: "ce:plan", title: "Almayı düşünüyorum" }])],
  };
}

function askSrc(draft: WaDraft): WaTurn {
  return {
    step: "src3",
    draft,
    effect: { type: "none" },
    replies: [
      reply("SRC3 belgen var mı?", [
        { id: "src:have", title: "SRC3 var" },
        { id: "src:plan", title: "Almayı düşünüyorum" },
        { id: "src:info", title: "Bilgi istiyorum" },
      ]),
    ],
  };
}

function askExperience(draft: WaDraft): WaTurn {
  return {
    step: "experience",
    draft,
    effect: { type: "none" },
    replies: [
      reply("Kaç yıllık sürücülük deneyimin var?", [
        { id: "ex:under_1", title: "1 yıldan az" },
        { id: "ex:y1_3", title: "1–3 yıl" },
        { id: "ex:y3_5", title: "3–5 yıl" },
        { id: "ex:y5_plus", title: "5 yıldan fazla" },
        { id: "ex:none", title: "Deneyim yok" },
      ]),
    ],
  };
}

function askGerman(draft: WaDraft): WaTurn {
  return {
    step: "german",
    draft,
    effect: { type: "none" },
    replies: [
      reply("Almanca seviyen nedir? Seviye bir yolu kapatmaz.", [
        { id: "de:none", title: "Hiç" },
        { id: "de:start", title: "Başlangıç" },
        { id: "de:mid", title: "Orta" },
        { id: "de:good", title: "İyi" },
      ]),
    ],
  };
}

function askFamily(draft: WaDraft): WaTurn {
  return {
    step: "family",
    draft,
    effect: { type: "none" },
    replies: [
      reply("Tek başına mı, ailenle mi gelmek istiyorsun?", [
        { id: "fa:alone", title: "Tek başıma" },
        { id: "fa:spouse", title: "Eşimle" },
        { id: "fa:family", title: "Eş ve çocuklar" },
      ]),
    ],
  };
}

function askSpouse(draft: WaDraft): WaTurn {
  return {
    step: "spouse",
    draft,
    effect: { type: "none" },
    replies: [
      reply("Eşin Almanca biliyor mu? Bu her dosyada aynı şart değildir.", [
        { id: "sp:yes", title: "Evet" },
        { id: "sp:no", title: "Hayır" },
        { id: "sp:unknown", title: "Bakılacak" },
      ]),
    ],
  };
}

function askChildren(draft: WaDraft): WaTurn {
  return {
    step: "children",
    draft,
    effect: { type: "none" },
    replies: [reply("Çocukların yaş aralığını kısaca yaz. Kesin bir yaş sınırı uygulanmış sayılmaz.", [{ id: "ch:skip", title: "Şimdilik atla" }])],
  };
}

function askName(draft: WaDraft): WaTurn {
  return { step: "name", draft, effect: { type: "none" }, replies: [reply("Adın nedir?")] };
}

function askCity(draft: WaDraft): WaTurn {
  return { step: "city", draft, effect: { type: "none" }, replies: [reply("Hangi şehirde yaşıyorsun?")] };
}

export function buttonsForWaStep(step: WaStep): WaButton[] {
  if (step === "ce") return [{ id: "ce:yes", title: "CE var" }, { id: "ce:plan", title: "Almayı düşünüyorum" }];
  if (step === "src3") return [{ id: "src:have", title: "SRC3 var" }, { id: "src:plan", title: "Almayı düşünüyorum" }, { id: "src:info", title: "Bilgi istiyorum" }];
  if (step === "experience") {
    return [
      { id: "ex:under_1", title: "1 yıldan az" },
      { id: "ex:y1_3", title: "1–3 yıl" },
      { id: "ex:y3_5", title: "3–5 yıl" },
      { id: "ex:y5_plus", title: "5 yıldan fazla" },
      { id: "ex:none", title: "Deneyim yok" },
    ];
  }
  if (step === "german") return [{ id: "de:none", title: "Hiç" }, { id: "de:start", title: "Başlangıç" }, { id: "de:mid", title: "Orta" }, { id: "de:good", title: "İyi" }];
  if (step === "family") return [{ id: "fa:alone", title: "Tek başıma" }, { id: "fa:spouse", title: "Eşimle" }, { id: "fa:family", title: "Eş ve çocuklar" }];
  if (step === "spouse") return [{ id: "sp:yes", title: "Evet" }, { id: "sp:no", title: "Hayır" }, { id: "sp:unknown", title: "Bakılacak" }];
  if (step === "children") return [{ id: "ch:skip", title: "Şimdilik atla" }];
  if (step === "confirm") return [{ id: "ok:yes", title: "Kaydı aç" }, { id: "menu", title: "Vazgeç" }];
  return MENU;
}

export function buttonTitlesFit(turn: WaTurn): boolean {
  return turn.replies.every((item) => item.buttons.every((button) => button.title.length <= 20 && button.id.length <= 40));
}
