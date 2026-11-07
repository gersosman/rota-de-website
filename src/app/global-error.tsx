"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <main style={{ maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 32, margin: 0 }}>Sayfa açılamadı</h1>
          <p style={{ lineHeight: 1.5 }}>Sunucu bu isteği tamamlayamadı. Bir kez yenileyin.</p>
          <button type="button" onClick={() => reset()}>Yeniden dene</button>
        </main>
      </body>
    </html>
  );
}
