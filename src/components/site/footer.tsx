import Link from "next/link";

export function SiteFooter({
  rights,
  labels,
}: {
  rights: string;
  labels: { impressum: string; datenschutz: string; agb: string; withdrawal: string };
}) {
  return (
    <footer className="mt-auto border-t border-border bg-card pb-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-serif text-lg">
          ROTA <span className="text-accent">DE</span>
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
          <Link href="/impressum" className="hover:text-foreground">{labels.impressum}</Link>
          <Link href="/datenschutz" className="hover:text-foreground">{labels.datenschutz}</Link>
          <Link href="/agb" className="hover:text-foreground">{labels.agb}</Link>
          <Link href="/iptal-iade" className="hover:text-foreground">{labels.withdrawal}</Link>
        </nav>
        <p className="text-xs text-muted-foreground">{rights}</p>
      </div>
    </footer>
  );
}
