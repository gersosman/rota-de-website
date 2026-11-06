import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function HomePage() {
  const copy = await getDictionary();
  return (
    <main>
      <section className="bg-[#0c1c2e] text-[#f4f1ea]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.3fr_0.7fr] md:py-24">
          <div>
            <p className="text-xs tracking-[0.22em] text-accent uppercase">{copy.home.kicker}</p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.05] text-balance md:text-6xl">{copy.home.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/75">{copy.home.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button nativeButton={false} variant="accent" className="h-11 px-5" render={<Link href="/on-degerlendirme" />}>
                {copy.home.primary}
              </Button>
              <Button nativeButton={false} variant="outline" className="h-11 border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white" render={<Link href="/nasil-calisir" />}>
                {copy.home.secondary}
              </Button>
            </div>
            <p className="mt-6 max-w-xl text-sm leading-6 text-white/55">{copy.disclaimer}</p>
          </div>
          <div className="flex flex-col justify-end rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between text-sm">
              <span>{copy.home.from}</span>
              <span className="text-accent">{copy.home.to}</span>
            </div>
            <div className="relative mt-8 h-24">
              <div className="absolute top-1/2 right-3 left-3 h-px bg-white/30" />
              <div className="absolute top-1/2 left-3 size-3 -translate-y-1/2 rounded-full bg-[#f4f1ea]" />
              <div className="absolute top-1/2 right-3 size-3 -translate-y-1/2 rounded-full bg-accent" />
              <svg viewBox="0 0 240 80" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <path d="M16 58 C 70 10, 160 10, 224 58" fill="none" stroke="#f4f1ea" strokeWidth="1.4" />
              </svg>
            </div>
            <p className="text-xs tracking-[0.18em] text-white/50 uppercase">TR — DE</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-3xl">{copy.home.principlesTitle}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {copy.home.principles.map((item) => (
            <article key={item.title} className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs tracking-[0.16em] text-accent uppercase">0{copy.home.principles.indexOf(item) + 1}</p>
              <h3 className="mt-3 font-serif text-2xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2">
          <div>
            <p className="text-xs tracking-[0.16em] text-accent uppercase">{copy.home.audienceTitle}</p>
            <h2 className="mt-3 font-serif text-3xl">{copy.home.forTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.home.forBody}</p>
          </div>
          <div className="rounded-2xl bg-[#0c1c2e] p-6 text-[#f4f1ea]">
            <h2 className="font-serif text-3xl">{copy.home.againstTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-white/70">{copy.home.againstBody}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
