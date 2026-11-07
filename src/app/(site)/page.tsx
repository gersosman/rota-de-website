import Image from "next/image";
import Link from "next/link";
import { TrackAnchor } from "@/components/site/track-anchor";
import { getDictionary } from "@/lib/i18n";
import { publicBotLink } from "@/server/telegram/inbox";

export const instant = false;

export default async function HomePage() {
  const copy = await getDictionary();
  const text = copy.phase3;
  const bot = await publicBotLink();
  const paths = [
    { href: "/almanyada-soforluk", title: copy.nav.germany, body: copy.germany.lead },
    { href: "/nasil-calisir", title: copy.nav.how, body: copy.how.lead },
    { href: "/on-degerlendirme", title: copy.nav.assessment, body: copy.home.forBody },
  ];
  return (
    <main>
      <section className="relative overflow-hidden bg-hero text-hero-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-xs tracking-[0.22em] text-accent uppercase">{text.slogan}</p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.02] text-balance md:text-6xl">{text.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-hero-muted">{text.heroLead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/on-degerlendirme" className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">
                {text.primary}
              </Link>
              <Link href="/iletisim" className="inline-flex h-12 items-center justify-center rounded-full border border-hero-border px-5 text-sm">
                {text.contactCta}
              </Link>
              {bot ? (
                <TrackAnchor href={bot} event="telegram_click" className="inline-flex h-12 items-center justify-center px-2 text-sm text-hero-muted">
                  {text.telegramCta}
                </TrackAnchor>
              ) : null}
            </div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]">
            <Image src="/photos/highway.jpg" alt={text.photoHighway} fill priority className="object-cover object-center" sizes="(min-width: 1024px) 50vw, 100vw" />
            <div className="pointer-events-none absolute inset-0 bg-[var(--hero-overlay)]" />
          </div>
        </div>
      </section>
      <section className="border-b border-border bg-card">
        <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-3">
          {[text.trustFree, text.trustHuman, text.trustPapers].map((item) => (
            <li key={item} className="text-sm leading-6">{item}</li>
          ))}
        </ul>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="max-w-2xl text-base leading-7">{copy.home.scope}</p>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {paths.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="group flex flex-col gap-1 py-5 transition-colors hover:text-accent md:flex-row md:items-baseline md:justify-between">
                <span className="font-serif text-2xl">{item.title}</span>
                <span className="max-w-xl text-sm leading-6 text-muted-foreground group-hover:text-foreground">{item.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="bg-band text-band-foreground">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="font-serif text-3xl leading-snug text-balance">{text.salaryTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-band-foreground/75">{text.salaryNote}</p>
          <Link href="/almanyada-soforluk#maas" className="mt-6 inline-flex text-sm font-medium text-accent">{copy.nav.germany}</Link>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-14">
        <p className="text-sm leading-7 text-muted-foreground">{copy.disclaimer}</p>
      </section>
    </main>
  );
}
