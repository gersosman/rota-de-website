import Image from "next/image";
import Link from "next/link";
import { LocaleSwitch } from "@/components/locale-switch";
import { MobileNav } from "@/components/site/mobile-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

const links = [
  ["germany", "/almanyada-soforluk"],
  ["how", "/nasil-calisir"],
  ["faq", "/sss"],
  ["contact", "/iletisim"],
  ["track", "/basvuru-takip"],
] as const;

export function SiteHeader({
  locale,
  labels,
  cta,
  themeToDark,
  themeToLight,
}: {
  locale: Locale;
  labels: Record<(typeof links)[number][0], string>;
  cta: string;
  themeToDark: string;
  themeToLight: string;
}) {
  const items = links.map(([key, href]) => ({ href, label: labels[key] }));
  return (
    <header className="sticky top-0 z-40 border-b border-hero-border bg-hero text-hero-foreground">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <MobileNav items={items.filter((item) => item.href !== "/iletisim")} cta={cta} contact={labels.contact} />
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/mark.svg" alt="" width={36} height={36} unoptimized className="size-9 shrink-0 rounded-lg" />
          <span className="flex items-baseline gap-1.5">
            <span className="font-serif text-xl tracking-tight">ROTA</span>
            <span className="text-sm font-semibold text-accent">DE</span>
          </span>
        </Link>
        <nav className="ml-3 hidden items-center gap-3 text-[13px] whitespace-nowrap text-hero-muted xl:flex">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-hero-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle toDark={themeToDark} toLight={themeToLight} />
          <LocaleSwitch locale={locale} />
          <Button nativeButton={false} variant="outline" className="hidden h-11 rounded-full border-hero-border bg-transparent px-4 text-hero-foreground hover:bg-white/10 md:inline-flex" render={<Link href="/iletisim" />}>
            {labels.contact}
          </Button>
          <Button nativeButton={false} variant="accent" className="h-11 rounded-full px-4" render={<Link href="/on-degerlendirme" />}>
            {cta}
          </Button>
        </div>
      </div>
    </header>
  );
}
