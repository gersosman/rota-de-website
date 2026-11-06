import Link from "next/link";

export function SiteFooter({
  note,
  legal,
  rights,
  labels,
}: {
  note: string;
  legal: string;
  rights: string;
  labels: { impressum: string; datenschutz: string; agb: string; withdrawal: string };
}) {
  return (
    <footer className="mt-auto border-t border-[#1e3348] bg-[#0c1c2e] text-[#f4f1ea]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-serif text-2xl">
            ROTA <span className="text-accent">DE</span>
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/70">{note}</p>
        </div>
        <div>
          <p className="text-xs tracking-[0.16em] text-accent uppercase">{legal}</p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li><Link href="/impressum">{labels.impressum}</Link></li>
            <li><Link href="/datenschutz">{labels.datenschutz}</Link></li>
            <li><Link href="/agb">{labels.agb}</Link></li>
            <li><Link href="/iptal-iade">{labels.withdrawal}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50">{rights}</div>
    </footer>
  );
}
