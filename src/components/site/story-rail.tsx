"use client";

import { useRef } from "react";

type Item = { id: string; name: string; city: string; body: string; representative: boolean };

const SAMPLES: Item[] = [
  { id: "s1", name: "Temsili örnek", city: "", body: "Abi süreç biraz zaman aldı ama sonunda sözleşmem geldi. İlginiz için teşekkür ederim.", representative: true },
  { id: "s2", name: "Temsili örnek", city: "", body: "Merhaba, iş sözleşmemi imzaladım. Şimdi sonraki aşamaları bekliyorum.", representative: true },
  { id: "s3", name: "Temsili örnek", city: "", body: "Vize sonucum geldi, destekleriniz için teşekkür ederim.", representative: true },
];

export function StoryRail({
  title,
  real,
  sampleTitle,
  sampleNote,
  emptyNote,
}: {
  title: string;
  real: Item[];
  sampleTitle: string;
  sampleNote: string;
  emptyNote: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const items = real.length > 0 ? real : SAMPLES;
  const representative = real.length === 0;

  function move(direction: number) {
    scroller.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  }

  return (
    <section className="bg-[#f4f1ea] py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl text-balance">{title}</h2>
          <div className="hidden gap-2 md:flex">
            <button type="button" aria-label="Önceki" onClick={() => move(-1)} className="h-10 w-10 rounded-full border border-[#0c1c2e]/20">←</button>
            <button type="button" aria-label="Sonraki" onClick={() => move(1)} className="h-10 w-10 rounded-full border border-[#0c1c2e]/20">→</button>
          </div>
        </div>
        {representative ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#0c1c2e]/70">{sampleNote}</p>
        ) : (
          <p className="mt-3 text-sm text-[#0c1c2e]/70">{emptyNote}</p>
        )}
        <div ref={scroller} className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {items.map((item) => (
            <article key={item.id} className="min-w-[260px] snap-start rounded-3xl border border-[#0c1c2e]/10 bg-white p-5 md:min-w-[320px]">
              <p className="text-xs tracking-[0.14em] text-accent uppercase">{item.representative || representative ? sampleTitle : item.city || "Deneyim"}</p>
              <p className="mt-3 text-sm leading-6">“{item.body}”</p>
              <p className="mt-4 text-sm font-medium">{item.representative || representative ? sampleTitle : item.name}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
