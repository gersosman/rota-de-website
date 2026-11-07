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
      <section className="relative overflow-hidden bg-[#0c1c2e] text-[#f4f1ea]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-xs tracking-[0.22em] text-accent uppercase">{text.slogan}</p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.02] text-balance md:text-6xl">{text.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">{text.heroLead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/on-degerlendirme" className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">
                {text.primary}
              </Link>
              <Link href="/iletisim" className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-5 text-sm">
                {text.contactCta}
              </Link>
              {bot ? (
                <TrackAnchor href={bot} event="telegram_click" className="inline-flex h-12 items-center justify-center px-2 text-sm text-white/70">
                  {text.telegramCta}
                </TrackAnchor>
              ) : null}
            </div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]">
            <Image src="/photos/highway.jpg" alt={text.photoHighway} fill priority className="object-cover object-center" sizes="(min-width: 1024px) 50vw, 100vw" />
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
        <h2 className="font-serif text-3xl text-balance">{copy.home.principlesTitle}</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {copy.home.principles.map((item) => (
            <li key={item.title} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-serif text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {paths.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex h-full flex-col rounded-2xl border border-border bg-background p-5 transition-colors hover:border-accent">
                <h3 className="font-serif text-xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="bg-[#163049] text-[#f4f1ea]">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="font-serif text-3xl leading-snug text-balance">{text.salaryTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-white/70">{text.salaryNote}</p>
          <Link href="/almanyada-soforluk#maas" className="mt-6 inline-flex text-sm font-medium text-accent">{copy.nav.germany}</Link>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-14">
        <p className="text-sm leading-7 text-muted-foreground">{copy.disclaimer}</p>
      </section>
    </main>
  );
}
