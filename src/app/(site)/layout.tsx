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
        labels={{
          how: copy.nav.how,
          germany: copy.nav.germany,
          conditions: copy.nav.conditions,
          services: copy.nav.services,
          faq: copy.nav.faq,
          contact: copy.nav.contact,
        }}
      />
      <div className="flex-1">{children}</div>
      <SiteFooter
        note={copy.footer.note}
        legal={copy.footer.legal}
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
