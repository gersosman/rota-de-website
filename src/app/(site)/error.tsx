"use client";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-20">
      <h1 className="font-serif text-4xl">Bir sorun oluştu</h1>
      <p className="mt-3 text-sm text-muted-foreground">Sayfa yüklenemedi. Ayrıntı gösterilmez.</p>
      <button type="button" className="mt-6 text-sm text-accent" onClick={() => reset()}>
        Yeniden dene
      </button>
    </main>
  );
}
