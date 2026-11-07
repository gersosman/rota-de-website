import { Assistant } from "@/components/site/assistant";
import { ConnectionNotice } from "@/components/site/connection-notice";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { getDictionary, getLocale } from "@/lib/i18n";

export const instant = false;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const copy = await getDictionary(locale);
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader
        locale={locale}
        cta={copy.nav.assessment}
        themeToDark={copy.nav.themeToDark}
        themeToLight={copy.nav.themeToLight}
        labels={{
          how: copy.nav.how,
          germany: copy.nav.germany,
          faq: copy.nav.faq,
          track: copy.nav.track,
        }}
      />
      <ConnectionNotice slow={copy.phase3.slow} offline={copy.phase3.offline} />
      <div className="flex-1">{children}</div>
      <Assistant copy={copy.assistant} />
      <SiteFooter
        rights={copy.footer.rights}
        labels={{
          impressum: copy.legal.impressum,
          datenschutz: copy.legal.datenschutz,
          agb: copy.legal.agb,
          withdrawal: copy.legal.withdrawal,
        }}
      />
    </div>
  );
}
