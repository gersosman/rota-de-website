import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function HomePage() {
  const copy = await getDictionary();
  const text = copy.phase3;
  const paths = [
    { href: "/on-degerlendirme", title: copy.nav.assessment, body: copy.home.forBody },
    { href: "/almanyada-soforluk", title: copy.nav.germany, body: copy.germany.lead },
    { href: "/nasil-calisir", title: copy.nav.how, body: copy.how.lead },
  ];
  return (
    <main>
      <section className="bg-hero text-hero-foreground">
        <div className="mx-auto max-w-3xl px-4 py-20 md:py-28">
          <p className="text-xs tracking-[0.22em] text-accent uppercase">ROTA DE</p>
          <h1 className="mt-5 font-serif text-5xl leading-[1.02] text-balance md:text-6xl">{text.heroTitle}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-hero-muted">{text.heroLead}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/iletisim" className="inline-flex h-14 w-full items-center justify-center rounded-full bg-accent px-8 text-base font-medium text-accent-foreground sm:w-auto">
              {text.contactCta}
            </Link>
            <Link href="/on-degerlendirme" className="inline-flex h-14 w-full items-center justify-center rounded-full border border-hero-foreground/30 bg-hero-foreground/5 px-8 text-base font-medium sm:w-auto">
              {text.primary}
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-16 md:py-20">
        <p className="text-lg leading-8">{copy.home.scope}</p>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{copy.home.forBody}</p>
        <ul className="mt-10 divide-y divide-border border-y border-border">
          {paths.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="group flex flex-col gap-1 py-5 hover:text-accent">
                <span className="font-serif text-2xl">{item.title}</span>
                <span className="text-sm leading-6 text-muted-foreground group-hover:text-foreground">{item.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-sm leading-7 text-muted-foreground">{copy.disclaimer}</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.phase3.papers}</p>
        </div>
      </section>
    </main>
  );
}
