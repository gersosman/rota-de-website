import Image from "next/image";
import { getDictionary } from "@/lib/i18n";

export const instant = false;

export default async function GermanyPage() {
  const copy = await getDictionary();
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
      <h1 className="font-serif text-4xl">{copy.germany.title}</h1>
      <p className="mt-4 leading-7 text-muted-foreground">{copy.germany.lead}</p>
      <div className="mt-10 space-y-8">
        {copy.germany.blocks.map((block) => (
          <section key={block.title}>
            <h2 className="font-serif text-2xl">{block.title}</h2>
            <p className="mt-2 text-sm leading-7">{block.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-muted-foreground">{copy.disclaimer}</p>
      </div>
      <div className="relative h-80 overflow-hidden rounded-3xl">
        <Image src="/photos/city.jpg" alt={copy.phase3.photoCity} fill className="object-cover" sizes="(min-width: 1024px) 40vw, 100vw" />
      </div>
    </main>
  );
}
