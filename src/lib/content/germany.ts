export const GUIDE_REVIEWED_ON = "2026-11-07";

export type GuideSection = {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  sourceLabel: string;
  sourceUrl: string;
};

const law = "https://www.gesetze-im-internet.de/beschv_2013/__24a.html";
const makeIt = "https://www.make-it-in-germany.com/de/visum-aufenthalt/arten/weitere/sonstige";
const bmdv = "https://www.bmdv.bund.de";
const arbeit = "https://www.arbeitsagentur.de";
const anerkennung = "https://www.anerkennung-in-deutschland.de";
const family = "https://www.make-it-in-germany.com/de/leben-in-deutschland/familie-nachholen";

export const guide: Record<"tr" | "de", GuideSection[]> = {
  tr: [
    {
      id: "gelis",
      title: "Almanya'ya şoför olarak gelmek",
      summary: "Çalışma, işveren ve yetkili makamın incelemesine bağlıdır. Bu bir otomatik hak değildir.",
      paragraphs: [
        "§ 24a BeschV iki ayrı yolu anlatır. Birinci fıkra, yük veya otobüs taşımacılığında meslekî sürücü olarak çalışmak için onay verilebileceğini söyler. İkinci fıkra, ehliyet ve yeterliliğin edinileceği ayrı bir yoldur; 15 ay bir üst sınırdır, otomatik hak değildir.",
      ],
      sourceLabel: "§ 24a BeschV",
      sourceUrl: law,
    },
    {
      id: "ce",
      title: "CE ehliyeti",
      summary: "CE, çekici ve römork birleşimini kapsayan ağır vasıta sınıfıdır. Türkiye'deki CE her dosyada aynı sonucu doğurmaz.",
      paragraphs: [
        "Belgenin Almanya'da doğrudan kullanılıp kullanılamayacağı sınıf, ülke ve güncel tanıma kuralına bağlıdır. Dönüşümde teori veya pratik sınav istenebilir. ROTA DE bunu dosyadan okur, sınav sonucunu garanti etmez.",
      ],
      sourceLabel: "Ulaştırma Bakanlığı",
      sourceUrl: bmdv,
    },
    {
      id: "src3",
      title: "SRC3",
      summary: "SRC3 Türkiye'deki meslek belgesidir. Alman veya AB meslekî yeterliliğinin yerine kendiliğinden geçmez.",
      paragraphs: [
        "Belge dosyaya not edilir. Fahrerqualifizierungsnachweis ile aynı belge değildir. Tanıma veya ek sınav gerekip gerekmediği kişisel duruma bağlıdır.",
      ],
      sourceLabel: "Anerkennung in Deutschland",
      sourceUrl: anerkennung,
    },
    {
      id: "fqn",
      title: "Code 95 ve FQN",
      summary: "Code 95, meslekî sürücü yeterliliğinin yaygın adıdır. Almanya'daki güncel belge Fahrerqualifizierungsnachweis, kısaca FQN'dir.",
      paragraphs: [
        "SRC3, FQN ile aynı belge değildir. Hangi belgenin isteneceği işin türüne ve çalışma statüsüne göre değişebilir.",
      ],
      sourceLabel: "Bundesministerium für Verkehr",
      sourceUrl: bmdv,
    },
    {
      id: "sonra",
      title: "Almanya'ya geldikten sonra ehliyet işlemleri",
      summary: "Varıştan sonraki işlem, girişteki belgeden ayrı yürür.",
      paragraphs: [
        "Kullanma, dönüştürme veya yeniden alma sınıf ve ülkeye göre değişir. ROTA DE eksik belgeyi açıklar, kurumun kararını üstlenmez.",
      ],
      sourceLabel: "§ 24a BeschV ve Ulaştırma Bakanlığı",
      sourceUrl: law,
    },
    {
      id: "isler",
      title: "Çalışma alanları",
      summary: "Gıda, silo, frigorifik, tenteli araç, konteyner, yerel, bölgesel ve uzun yol taşımacılığı ayrı işlerdir.",
      paragraphs: [
        "Her aday aynı işi bulamaz. Kayıtlı gerçek bir fırsat yokken ilan gösterilmez.",
      ],
      sourceLabel: "Federal İş Ajansı",
      sourceUrl: arbeit,
    },
    {
      id: "duzen",
      title: "Çalışma düzeni",
      summary: "Uzun yol, bölgesel dağıtım ve yerel iş aynı günü yaşatmaz.",
      paragraphs: [
        "Gece, hafta sonu ve sürüş-dinlenme süreleri işverene ve kurallara göre değişir. Kişisel bir vardiya vaadi verilmez.",
      ],
      sourceLabel: "Ulaştırma Bakanlığı",
      sourceUrl: bmdv,
    },
    {
      id: "maas",
      title: "Maaş ve sözleşme",
      summary: "Doğrulanmış işveren verisi yokken rakam yayımlanmaz.",
      paragraphs: [
        "Brüt ve net aynı sayı değildir. Saat, gece ve fazla mesai sözleşmeye bağlıdır. Kaynak ve dönem yazılmadan maaş örneği konulmaz.",
      ],
      sourceLabel: "Kayıtlı işveren verisi beklenir",
      sourceUrl: arbeit,
    },
    {
      id: "yasam",
      title: "Konaklama ve yaşam",
      summary: "Konaklama sözleşmeye bağlıdır. Sigorta, banka, vergi numarası ve adres kaydı ayrı adımlardır.",
      paragraphs: [
        "Bunların hiçbiri ilk başvuruda istenen bir belge paketi değildir.",
      ],
      sourceLabel: "Make it in Germany",
      sourceUrl: "https://www.make-it-in-germany.com/de/leben-in-deutschland/geld-versicherung",
    },
    {
      id: "aile",
      title: "Aileyle gelmek",
      summary: "Tek başına gelmek, eşle gelmek ve çocuklarla gelmek ayrı durumlardır.",
      paragraphs: [
        "Eş için A1 şartı her oturum türüne kendiliğinden uygulanmaz. Koşullar oturum türüne ve aile durumuna göre değişir. ROTA DE bu kararı vermez.",
      ],
      sourceLabel: "Make it in Germany — aile",
      sourceUrl: family,
    },
    {
      id: "sozlesme",
      title: "İş sözleşmesi ve vize süreci",
      summary: "İş sözleşmesi ile vize aynı sonuç değildir.",
      paragraphs: [
        "Sözleşme, gerçek bir işveren bağlantısı ve imza varsa ilerler. Vize kararını yetkili makam verir. İmzalanmış sözleşme vize onayı değildir.",
      ],
      sourceLabel: "Make it in Germany ve § 24a BeschV",
      sourceUrl: makeIt,
    },
    {
      id: "destek",
      title: "ROTA DE desteği",
      summary: "Başvuru kaydı, süreç açıklaması ve uygun dosyalarda eşleştirme koordinasyonu.",
      paragraphs: [
        "ROTA DE resmî kurum, işveren veya vize mercii değildir. İlk adımda evrak istenmez. Dönüş e-posta ile yapılır.",
      ],
      sourceLabel: "§ 24a BeschV",
      sourceUrl: law,
    },
  ],
  de: [
    {
      id: "gelis",
      title: "Wie kommt man als Fahrer nach Deutschland?",
      summary: "Für Drittstaatsangehörige hängt die Beschäftigung von Arbeitgeber und Zustimmung ab. Es ist kein automatisches Recht.",
      paragraphs: [
        "§ 24a Abs. 1 BeschV sagt, dass die Zustimmung für eine inländische Beschäftigung als Berufskraftfahrer im Güterkraftverkehr oder im Personenverkehr mit Kraftomnibussen erteilt werden kann.",
        "Abs. 2 ist ein eigener Weg. Der Vertrag muss die Teilnahme an Maßnahmen verpflichten, die Bedingungen müssen Führerschein und Qualifikation einschließlich der Dokumente innerhalb von 15 Monaten ermöglichen, danach braucht es ein konkretes Arbeitsplatzangebot beim selben Arbeitgeber, und die einschlägige Fahrerlaubnis aus dem Herkunftsland muss nachgewiesen werden. Die Zustimmung wird für bis zu 15 Monate erteilt, im begründeten Einzelfall um bis zu sechs Monate. Das ist kein automatisches Recht.",
      ],
      sourceLabel: "§ 24a BeschV",
      sourceUrl: law,
    },
    {
      id: "ce",
      title: "CE-Führerschein und Umschreibung",
      summary: "Ein türkischer CE-Führerschein erlaubt nicht in jedem Fall die direkte Arbeit in Deutschland.",
      paragraphs: [
        "Ob Theorie oder Praxis nötig werden, hängt von Land, Klasse und persönlicher Lage ab. ROTA DE ordnet die Unterlagen und verspricht kein Prüfungsergebnis.",
      ],
      sourceLabel: "Bundesministerium für Verkehr",
      sourceUrl: bmdv,
    },
    {
      id: "src3",
      title: "SRC3 und die deutsche Qualifikation",
      summary: "SRC3 ist ein türkischer Nachweis. Er ersetzt die deutsche oder EU-Qualifikation nicht automatisch.",
      paragraphs: [
        "Grundqualifikation und beschleunigte Grundqualifikation sind getrennte Wege. Welche Prüfung nötig ist, bleibt eine persönliche Prüfung.",
      ],
      sourceLabel: "Anerkennung in Deutschland",
      sourceUrl: anerkennung,
    },
    {
      id: "fqn",
      title: "Code 95 und Fahrerqualifizierungsnachweis",
      summary: "Code 95 ist der geläufige Name. Der aktuelle deutsche Nachweis ist der Fahrerqualifizierungsnachweis (FQN).",
      paragraphs: ["SRC3 und FQN sind nicht dasselbe Dokument."],
      sourceLabel: "Bundesministerium für Verkehr",
      sourceUrl: bmdv,
    },
    {
      id: "sonra",
      title: "Führerschein nach der Einreise",
      summary: "Der Vorgang nach der Ankunft ist ein eigener Verwaltungsschritt.",
      paragraphs: ["ROTA DE erklärt den Weg und übernimmt nicht die Entscheidung der Behörde."],
      sourceLabel: "§ 24a BeschV",
      sourceUrl: law,
    },
    {
      id: "isler",
      title: "Welche Arbeit möglich ist",
      summary: "Lebensmittel, Silo, Kühlung, Plane, Container, Nah-, Regional- und Fernverkehr sind verschiedene Tätigkeiten.",
      paragraphs: ["Nicht jeder Bewerber erhält dieselbe Stelle. Ohne echten Arbeitgeber zeigt ROTA DE keine Stelle."],
      sourceLabel: "Bundesagentur für Arbeit",
      sourceUrl: arbeit,
    },
    {
      id: "duzen",
      title: "Arbeitsrhythmus",
      summary: "Nacht, Wochenende und Überstunden hängen vom Arbeitgeber ab.",
      paragraphs: ["Lenk- und Ruhezeiten bleiben ein eigenes Regelwerk. Ein Vertrag muss den Dienst beschreiben."],
      sourceLabel: "Bundesministerium für Verkehr",
      sourceUrl: bmdv,
    },
    {
      id: "maas",
      title: "Lohn",
      summary: "Ohne geprüfte Arbeitgeberdaten wird keine Zahl veröffentlicht.",
      paragraphs: [
        "Brutto und netto sind verschieden. Ohne Quelle, Zeitraum und Brutto- oder Nettoangabe erscheint kein Lohnbeispiel.",
      ],
      sourceLabel: "Bundesagentur für Arbeit",
      sourceUrl: arbeit,
    },
    {
      id: "yasam",
      title: "Wohnen und Alltag",
      summary: "Unterkunft, Krankenversicherung, Konto, Steuer-ID, Anmeldung und Sozialversicherung folgen der persönlichen Lage.",
      paragraphs: ["Das ist keine Dokumentenliste für die erste Anfrage."],
      sourceLabel: "Make it in Germany",
      sourceUrl: "https://www.make-it-in-germany.com/de/leben-in-deutschland/geld-versicherung",
    },
    {
      id: "aile",
      title: "Mit der Familie",
      summary: "A1 für den Partner gilt nicht automatisch für jede Aufenthaltsart.",
      paragraphs: [
        "Ehepartner und Kinder hängen vom Aufenthalt und von der Familiensituation ab. Ein Alter wird hier nicht für alle Fälle festgeschrieben.",
      ],
      sourceLabel: "Make it in Germany — Familie",
      sourceUrl: family,
    },
    {
      id: "sozlesme",
      title: "Vertrag und Visum",
      summary: "Ein Arbeitsvertrag ist keine Visumzusage.",
      paragraphs: [
        "Ein Vertrag entsteht nur mit echtem Arbeitgeber, passenden Bedingungen und Unterschrift. Visum und Aufenthalt entscheiden die zuständigen Stellen.",
      ],
      sourceLabel: "Make it in Germany",
      sourceUrl: makeIt,
    },
    {
      id: "destek",
      title: "Was ROTA DE leistet",
      summary: "Persönliche Akte und Kontakt. Keine Rechtsberatung und kein Visumversprechen.",
      paragraphs: ["Im ersten Schritt werden kein Pass und kein Ausweis verlangt."],
      sourceLabel: "§ 24a BeschV",
      sourceUrl: law,
    },
  ],
};

export const LEGAL_REVIEW = [
  "Künye (Impressum) taslaktır. Ticaret unvanı, adres ve sorumlu kişi işletme onayı olmadan yayımlanmaz.",
  "Datenschutz taslaktır. Hukuki dayanak ve saklama süresi avukat onayı bekler.",
  "AGB taslaktır. Ücret, ifa ve sorumluluk bağlayıcı ilan edilmez.",
  "İptal ve iade koşulları hukuk incelemesi olmadan ilan edilmez. Bu sürümde tahsilat yoktur.",
  "§ 24a BeschV metni 7 Kasım 2026 tarihinde gesetze-im-internet.de üzerinden okundu. Hukuk onayı bekler.",
  "AufenthG kapsamındaki aile birleşimi genellenmez. Güncel Make it in Germany sayfası bağlantı olarak durur.",
  "SGB III § 296 ve sınır ötesi yerleştirme bildirimi § 299 hukuk inceleme listesindedir. Bu sitede uygulanmış bir izin gibi yazılmaz.",
  "Hizmet bedeli ve iade politikası işletme onayı bekler.",
  "Çerez: üçüncü taraf reklam çerezi yok. Kendi sunucuda anonim ziyaret sayımı var.",
  "Kişisel veriye erişim ve silme talebi panelde kayıt olur. Sonuç bu sayfada otomatik açıklanmaz.",
] as const;
