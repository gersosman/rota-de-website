import type { Metadata } from "next";
import Link from "next/link";
import { guide } from "@/lib/content/germany";
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
  return (
    <main>
      <section className="bg-hero text-hero-foreground">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <p className="text-xs tracking-[0.18em] text-accent uppercase">{copy.nav.germany}</p>
          <h1 className="mt-4 font-serif text-4xl text-balance md:text-5xl">{copy.germany.title}</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-hero-muted">{copy.germany.lead}</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <nav className="flex flex-col gap-2 text-sm">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="text-foreground underline-offset-4 hover:underline">{section.title}</a>
          ))}
        </nav>
        <div className="mt-10 space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-serif text-3xl text-balance">{section.title}</h2>
              <p className="mt-3 text-base leading-7">{section.summary}</p>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="mt-3 text-sm leading-7 text-muted-foreground">{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
        {extra.length > 0 ? (
          <div className="mt-12 space-y-8">
            {extra.map((article) => (
              <section key={article.id}>
                <h2 className="font-serif text-2xl">{article.title}</h2>
                <p className="mt-3 text-sm leading-7 whitespace-pre-wrap">{article.body}</p>
              </section>
            ))}
          </div>
        ) : null}
        <section className="mt-16 border-t border-border pt-8">
          <p className="text-sm leading-7 text-muted-foreground">{copy.germany.notice}</p>
          <ul className="mt-6 space-y-2 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={section.sourceUrl} className="text-accent" rel="noreferrer">{section.title}: {section.sourceLabel}</a>
              </li>
            ))}
          </ul>
        </section>
        <Link href="/on-degerlendirme" className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-full bg-accent px-8 text-base font-medium text-accent-foreground sm:w-auto">{copy.nav.assessment}</Link>
      </div>
    </main>
  );
}
