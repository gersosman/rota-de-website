import Image from "next/image";
import Link from "next/link";
import { HomeStories } from "@/components/site/home-stories";
import { TrackAnchor } from "@/components/site/track-anchor";
import { getDictionary } from "@/lib/i18n";
import { publicWhatsappLink } from "@/server/whatsapp/inbox";

export const instant = false;

export default async function HomePage() {
  const copy = await getDictionary();
  const whatsapp = await publicWhatsappLink();
  const text = copy.phase3;
  return (
    <main>
      <section className="relative overflow-hidden bg-[#0c1c2e] text-[#f4f1ea]">
        <div className="mx-auto grid min-h-[78vh] max-w-6xl items-center gap-8 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="text-xs tracking-[0.22em] text-accent uppercase">{text.slogan}</p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.02] text-balance md:text-6xl">{text.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">{text.heroLead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/on-degerlendirme" className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">
                {text.primary}
              </Link>
              {whatsapp ? (
                <TrackAnchor href={whatsapp} event="whatsapp_click" className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm">
                  {text.whatsapp}
                </TrackAnchor>
              ) : (
                <Link href="/iletisim#whatsapp" className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm">
                  {text.whatsapp}
                </Link>
              )}
            </div>
          </div>
          <div className="relative h-80 overflow-hidden rounded-[2rem] lg:h-[32rem]">
            <Image src="/photos/highway.jpg" alt={text.photoHighway} fill priority className="rota-drift object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c1c2e]/50 to-transparent" />
          </div>
        </div>
      </section>
      <section className="border-b border-border bg-card">
        <ul className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-3">
          {[text.trustFree, text.trustHuman, text.trustPapers].map((item) => (
            <li key={item} className="text-sm leading-6">{item}</li>
          ))}
        </ul>
      </section>
      <HomeStories copy={text} />
      <section className="bg-[#163049] text-[#f4f1ea]">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <p className="font-serif text-3xl leading-snug text-balance">{text.salaryTitle}</p>
          <p className="mt-4 text-sm leading-6 text-white/70">{text.salaryNote}</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-14">
        <p className="text-lg leading-8">{text.papers}</p>
        <p className="mt-6 text-sm text-muted-foreground">{copy.disclaimer}</p>
      </section>
    </main>
  );
}
