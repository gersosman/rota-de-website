import Image from "next/image";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function HowPage() {
  const copy = await getDictionary();
  return (
    <main className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-14 lg:grid-cols-[1fr_1fr] lg:py-20">
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl lg:sticky lg:top-24">
        <Image src="/photos/process-dawn.jpg" alt={copy.phase3.photoProcess} fill className="object-cover object-center" sizes="(min-width: 1024px) 50vw, 100vw" />
      </div>
      <div>
      <h1 className="font-serif text-4xl">{copy.how.title}</h1>
      <p className="mt-4 text-muted-foreground">{copy.how.lead}</p>
      <ol className="mt-10 space-y-6">
        {copy.how.steps.map((step, index) => (
          <li key={step.title} className="grid grid-cols-[auto_1fr] gap-4">
            <span className="font-serif text-3xl text-accent">{index + 1}</span>
            <div>
              <h2 className="text-lg font-medium">{step.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      </div>
    </main>
  );
}
