import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GUIDE_REVIEWED_ON, guide } from "@/lib/content/germany";
import { getDictionary, getLocale } from "@/lib/i18n";
import { publishedArticles } from "@/server/operations";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getDictionary();
  return {
    title: copy.germany.title,
    description: copy.germany.lead,
  };
}

export default async function GermanyPage() {
  const locale = await getLocale();
  const copy = await getDictionary(locale);
  const sections = guide[locale];
  const extra = await publishedArticles(locale);
  const reviewed = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "tr-TR", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(new Date(`${GUIDE_REVIEWED_ON}T12:00:00Z`));
  return (
    <main>
      <section className="bg-[#0c1c2e] text-[#f4f1ea]">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs tracking-[0.18em] text-accent uppercase">{copy.nav.germany}</p>
            <h1 className="mt-3 font-serif text-4xl text-balance md:text-5xl">{copy.germany.title}</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-white/75">{copy.germany.lead}</p>
          </div>
          <div className="relative h-72 overflow-hidden rounded-3xl">
            <Image src="/photos/highway.jpg" alt={copy.phase3.photoHighway} fill className="object-cover" sizes="(min-width: 1024px) 40vw, 100vw" />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="rounded-2xl border border-amber-700/30 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          {copy.conditions.unverified} {reviewed}.
        </p>
        <nav className="mt-8 flex flex-col gap-2 text-sm">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="text-[#0c1c2e] underline-offset-4 hover:underline">{section.title}</a>
          ))}
        </nav>
        <div className="mt-10 space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="font-serif text-3xl text-balance">{section.title}</h2>
              <p className="mt-3 text-base leading-7">{section.summary}</p>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mt-3 text-sm leading-7 text-muted-foreground">{paragraph}</p>
              ))}
              <p className="mt-3 text-xs">
                <a href={section.sourceUrl} className="text-accent" rel="noreferrer">{section.sourceLabel}</a>
                <span className="text-muted-foreground"> · {reviewed}</span>
              </p>
            </section>
          ))}
        </div>
        {extra.length > 0 ? (
          <div className="mt-12 space-y-8">
            {extra.map((article) => (
              <section key={article.id}>
                <h2 className="font-serif text-2xl">{article.title}</h2>
                <p className="mt-3 text-sm leading-7 whitespace-pre-wrap">{article.body}</p>
                {article.source_url ? <p className="mt-2 text-xs"><a className="text-accent" href={article.source_url}>{article.source_label || article.source_url}</a> · {article.reviewed_on || reviewed}</p> : null}
              </section>
            ))}
          </div>
        ) : null}
        <p className="mt-12 text-sm text-muted-foreground">{copy.disclaimer}</p>
        <Link href="/on-degerlendirme" className="mt-6 inline-flex h-12 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">{copy.nav.assessment}</Link>
      </div>
    </main>
  );
}
