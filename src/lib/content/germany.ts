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
      title: "Almanya'ya şoför olarak nasıl gelinir?",
      summary: "Üçüncü ülke vatandaşı için çalışma, işveren ve Federal İş Ajansı onayıyla incelenir. Bu bir otomatik hak değildir.",
      paragraphs: [
        "Almanya'da meslekî sürücü olarak çalışmak isteyen üçüncü ülke vatandaşları için genel çerçeve; geçerli bir iş ilişkisi, işverenin koşulları ve yetkili makamın onayına bağlıdır. ROTA DE bu kararı veremez.",
        "İstihdam Tüzüğü § 24a iki ayrı yolu anlatır. Birinci fıkra, yurt içindeki yük taşımacılığında veya otobüsle yolcu taşımacılığında meslekî sürücü olarak çalışmak için onay verilebileceğini söyler. Bu bir 'verilir' hükmü değil, 'verilebilir' hükmüdür.",
        "İkinci fıkra ayrı bir yoldur. İş sözleşmesi, kişinin meslek için gereken ehliyet ve yeterlilikleri edinme tedbirlerine katılmasını zorunlu kılmalı; koşullar bu belge ve yeterliliklerin 15 ay içinde alınabilmesine elverişli olmalı; aynı işverende, yeterlilikten sonrası için somut bir iş teklifi bulunmalı ve kişi, geldiği ülkede bu meslek için ilgili sürücü belgesini taşıdığını göstermelidir. Onay en fazla 15 ay için verilir. Gerekçeli tekil durumda en fazla altı ay daha uzatılabilir. 15 ay otomatik hak değildir.",
        "İş sözleşmesi, işveren, Federal İş Ajansı onayı, eğitim ve çalışma şartları her dosyada ayrıca okunur. Eksik bilgi varsa dosya insan incelemesinde kalır.",
      ],
      sourceLabel: "§ 24a BeschV",
      sourceUrl: law,
    },
    {
      id: "ce",
      title: "CE ehliyeti ve Almanya'da ehliyet dönüşümü",
      summary: "CE, çekici ve römork birleşimini kapsayan ağır vasıta sınıfıdır. Türkiye'deki CE, her durumda Almanya'da doğrudan çalışmak için yeterli sayılmaz.",
      paragraphs: [
        "CE ehliyeti, kamyon ve ağır römork kombinasyonunu sürmek için kullanılan sürücü belgesi sınıfıdır. Hangi sınıfın hangi araca yettiği, belgenin verildiği ülkenin ve kullanılacağı ülkenin kurallarına göre değişir.",
        "Türkiye'de alınmış bir CE belgesiyle Almanya'da doğrudan çalışılıp çalışılamayacağı, belgenin sınıfına, kişinin yerleşim ve çalışma durumuna ve Almanya'nın o ülke için uyguladığı tanıma veya dönüştürme kuralına bağlıdır. Bunu her aday için aynı cümleyle kapatmak doğru olmaz.",
        "Ehliyet dönüşümü, mevcut belgenin Alman belgesine çevrilmesi sürecidir. Bazı ülke ve sınıflarda teori ve pratik sınav istenebilir, bazılarında istenmeyebilir. Bu ayrım kişisel dosyadan ve güncel idari uygulamadan okunur.",
        "Almanya'da yeni bir ehliyet almak da ayrı bir yoldur: sürücü kursu, sınavlar ve meslek için gereken ek belgeler. ROTA DE bu süreci adayın dosyasındaki belgelerle karşılaştırır, hangi kurumun ne isteyeceğini listeler ve randevu ile evrak takibini koordine eder. Sınav sonucunu veya ehliyetin verileceğini garanti etmez.",
      ],
      sourceLabel: "Ulaştırma Bakanlığı",
      sourceUrl: bmdv,
    },
    {
      id: "src3",
      title: "SRC3 ile Almanya'daki meslekî yeterlilik",
      summary: "SRC3 Türkiye'deki meslek belgesidir. Alman veya AB meslekî yeterliliğinin yerine kendiliğinden geçmez.",
      paragraphs: [
        "SRC3, Türkiye'de uluslararası yük taşımacılığı yapan sürücüler için düzenlenen meslekî yeterlilik belgesidir. ROTA DE bu belgeyi dosyada not eder.",
        "SRC3'ün Almanya'daki Fahrerqualifizierungsnachweis veya AB meslekî yeterliliği yerine otomatik olarak kabul edildiği varsayılmaz. Tanıma, denklik veya ek sınav gerekip gerekmediği kişisel duruma ve güncel idari uygulamaya bağlıdır.",
        "Almanya'da meslekî sürücü yeterliliği için temel yeterlilik (Grundqualifikation) ve hızlandırılmış temel yeterlilik (beschleunigte Grundqualifikation) ayrı eğitim ve sınav yollarıdır. Hangisinin gündeme geleceği, kişinin mevcut belgelerine göre değişir.",
      ],
      sourceLabel: "Anerkennung in Deutschland",
      sourceUrl: anerkennung,
    },
    {
      id: "fqn",
      title: "Code 95 ve Fahrerqualifizierungsnachweis",
      summary: "Code 95, AB meslekî sürücü yeterliliğinin yaygın adıdır. Almanya'da güncel belge Fahrerqualifizierungsnachweis, kısaca FQN'dir.",
      paragraphs: [
        "Code 95, meslekî sürücü yeterliliğinin sürücüler arasında bilinen adıdır. Almanya'da bu yeterliliğin güncel ispatı Fahrerqualifizierungsnachweis (FQN) olarak düzenlenir.",
        "SRC3, FQN ile aynı belge değildir. Birinde olması diğerinin yerine geçmez. Süresi dolmuş veya başka ülkeye ait bir yeterlilik belgesi de ayrıca incelenir.",
        "Hangi belgenin isteneceği işin türüne, aracın kullanım amacına ve kişinin Almanya'daki çalışma statüsüne göre değişebilir. Kesin liste, insan incelemesinden sonra yazılır.",
      ],
      sourceLabel: "Bundesministerium für Verkehr",
      sourceUrl: bmdv,
    },
    {
      id: "sonra",
      title: "Almanya'ya geldikten sonra ehliyet süreci",
      summary: "Varıştan sonraki işlem, girişteki belgeden bağımsız olarak ayrıca yürür.",
      paragraphs: [
        "Almanya'ya geldikten sonra ehliyetin kullanılması, dönüştürülmesi veya yeniden alınması, giriş anındaki belgeden ayrı bir idari işlemdir. Süreler ve istenen sınavlar sınıf ve ülkeye göre değişir.",
        "ROTA DE bu adımda adaya hangi kuruma gideceğini, hangi belgenin dosyada bulunduğunu ve neyin eksik olduğunu açıklar. Kurumun kararını üstlenmez.",
      ],
      sourceLabel: "§ 24a BeschV ve Ulaştırma Bakanlığı",
      sourceUrl: law,
    },
    {
      id: "isler",
      title: "Hangi işlerde çalışılabilir?",
      summary: "Ağır vasıta işi tek bir ilan değildir. İşvereninin faaliyet alanı ve adayın yeterliliği sonucu değiştirir.",
      paragraphs: [
        "Ağır vasıta sürücüleri gıda taşımacılığı, silo, frigorifik, tenteli araç, konteyner, yerel dağıtım, bölgesel taşımacılık ve uzun yol taşımacılığında çalışabilir.",
        "Her aday aynı işi bulamaz. İşverenin filosu, vardiyası, dil beklentisi ve adayın ehliyet ile yeterlilik durumu birlikte okunur. ROTA DE, kayıtlı gerçek bir iş fırsatı yokken ilan göstermez.",
      ],
      sourceLabel: "Federal İş Ajansı",
      sourceUrl: arbeit,
    },
    {
      id: "duzen",
      title: "Tır şoförlerinin çalışma düzeni",
      summary: "Sürüş ve dinlenme süreleri işin türüne göre değişir. Sözleşme bu düzeni yazmadan genelleme yapılmaz.",
      paragraphs: [
        "Uzun yol, bölgesel dağıtım ve yerel iş aynı günü yaşatmaz. Gece, hafta sonu ve bekleme süreleri işverene göre değişir.",
        "Avrupa sürüş ve dinlenme kuralları ayrıca uygulanır. ROTA DE bu kuralları adayın sözleşmesindeki görevle karşılaştırır, kişisel bir vardiya vaadi vermez.",
      ],
      sourceLabel: "Ulaştırma Bakanlığı",
      sourceUrl: bmdv,
    },
    {
      id: "maas",
      title: "Maaş ve gelir beklentisi",
      summary: "Doğrulanmış işveren verisi yokken rakam yayımlanmaz.",
      paragraphs: [
        "Brüt tutar, vergiden ve sosyal kesintilerden önceki ücrettir. Net tutar vergi sınıfı, çocuk durumu ve diğer kesintilerle değişir. İkisi aynı sayı değildir.",
        "Çalışma saati, gece, hafta sonu ve fazla mesai ödemeleri işverene ve sözleşmeye göre değişebilir. Sözleşmede yazmayan bir kalem gelir sayılmaz.",
        "Bu sitede, kaynağı, brüt veya net oluşu, dayandığı çalışma süresi ve geçerli olduğu dönem yazılmadan maaş örneği konulmaz. 3.000 euro net bir vaat değildir ve bu sayfada rakam olarak yer almaz.",
      ],
      sourceLabel: "Kayıtlı işveren verisi beklenir",
      sourceUrl: arbeit,
    },
    {
      id: "yasam",
      title: "Konaklama ve yaşam",
      summary: "Günlük yaşam, işe başladıktan sonra adım adım açılır. Uzun bir evrak listesi değildir.",
      paragraphs: [
        "Konaklama, işverenin sağlayıp sağlamadığına ve sözleşmeye bağlıdır. Sağlık sigortası ve sosyal güvenlik, çalışmaya başlama ile birlikte yürüyen ayrı kurumlardır.",
        "Banka hesabı, vergi numarası ve adres kaydı (Anmeldung) yerleşimin parçasıdır. İşe başlama günü sözleşmede ve işverenin bildirimlerinde netleşir. Aile yaşamı, kişinin yanında gelenlere göre ayrıca konuşulur.",
        "Bunların hiçbiri ilk başvuruda istenen bir belge paketi değildir.",
      ],
      sourceLabel: "Make it in Germany",
      sourceUrl: "https://www.make-it-in-germany.com/de/leben-in-deutschland/geld-versicherung",
    },
    {
      id: "aile",
      title: "Aileyle Almanya'ya gelme",
      summary: "Bekâr aday, eş ve çocuk aynı dosya değildir. A1 şartı her oturum türüne kendiliğinden uygulanmaz.",
      paragraphs: [
        "Tek başına gelmek, eşle gelmek ve çocuklarla gelmek ayrı aile durumlarıdır. İlk form yalnızca niyeti kaydeder.",
        "Eş için A1 Almanca şartı bütün oturum türlerine otomatik uygulanmaz. Aile birleşiminin şartları, kişinin oturum türüne ve aile durumuna göre değişir.",
        "Çocukların yaşı ve başvuru koşulları her aile için aynı cümleyle anlatılamaz. Güncel çerçeve, Make it in Germany aile sayfasından izlenir. ROTA DE bu kararı vermez.",
      ],
      sourceLabel: "Make it in Germany — aile",
      sourceUrl: family,
    },
    {
      id: "sozlesme",
      title: "İş sözleşmesi ve vize süreci",
      summary: "İş sözleşmesi ile vize aynı sonuç değildir.",
      paragraphs: [
        "İş fırsatı ve iş sözleşmesi, ROTA DE'nin işverenle yaptığı gerçek bağlantı, adayın koşulları, işverenin onayı ve imzalanan sözleşme varsa ilerler. Sözleşme imzalanmadan iş garantisi gösterilmez.",
        "Çalışma vizesi ve oturum izninin kararı Alman temsilciliği ve yetkili makamlara aittir. İmzalanmış bir sözleşme vize onayı değildir. Ret, gecikme veya ek belge talebi mümkün kalır.",
        "Panelde eşleştirme, görüşme, teklif, sözleşme ve resmi başvuru ayrı aşamalardır. Vize onayı, işe başlamakla aynı kutu değildir.",
      ],
      sourceLabel: "Make it in Germany ve § 24a BeschV",
      sourceUrl: makeIt,
    },
    {
      id: "destek",
      title: "ROTA DE adaya ne sunar?",
      summary: "Kişisel dosya, insan incelemesi ve iletişim. Hukuki karar veya vize vaadi değildir.",
      paragraphs: [
        "ROTA DE başvuruyu alır, sürüş geçmişini ve hedefi okur, uygunluk görürse kayıtlı gerçek bir işveren fırsatıyla eşleştirmeyi konuşur, görüşme ve sözleşme adımlarını izler.",
        "Ehliyet ve meslekî yeterlilik sürecini resmi kaynaklara dayanarak açıklar. Çalışma ve vize başvurusunda adayın elindeki bilgiyi düzenler. Resmî kurum, işveren veya vize mercii değildir.",
        "İlk başvuruda pasaport, kimlik veya belge fotoğrafı istenmez. Destek ekibi, seçilen kanaldan — Telegram, e-posta veya telefon — döner.",
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
        "Brutto und netto sind verschieden. Steuerklasse, Arbeitszeit und Zeitraum müssen genannt sein, bevor ein Beispiel erscheint. 3.000 Euro netto ist kein Versprechen.",
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
      summary: "Akte, menschliche Prüfung und Kontakt. Keine Rechtsberatung und kein Visumversprechen.",
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
