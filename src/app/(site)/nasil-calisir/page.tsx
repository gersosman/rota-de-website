import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function HowPage() {
  const copy = await getDictionary();
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:py-20">
      <h1 className="font-serif text-4xl md:text-5xl">{copy.how.title}</h1>
      <p className="mt-4 text-lg leading-8 text-muted-foreground">{copy.how.lead}</p>
      <ol className="mt-12 space-y-8">
        {copy.how.steps.map((step, index) => (
          <li key={step.title} className="grid grid-cols-[auto_1fr] gap-5">
            <span className="font-serif text-3xl text-accent">{index + 1}</span>
            <div>
              <h2 className="text-xl font-medium">{step.title}</h2>
              <p className="mt-2 text-base leading-7 text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Link href="/iletisim" className="inline-flex h-14 w-full items-center justify-center rounded-full bg-accent px-8 text-base font-medium text-accent-foreground sm:w-auto">{copy.phase3.contactCta}</Link>
        <Link href="/on-degerlendirme" className="inline-flex h-14 w-full items-center justify-center rounded-full border border-border px-8 text-base font-medium sm:w-auto">{copy.nav.assessment}</Link>
      </div>
    </main>
  );
}
