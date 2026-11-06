import Link from "next/link";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

const links = [
  ["Genel bakış", "/admin"],
  ["Adaylar", "/admin/adaylar"],
  ["Bilgi bankası", "/admin/bilgi"],
  ["Denetim", "/admin/denetim"],
  ["Ayarlar", "/admin/ayarlar"],
  ["Entegrasyonlar", "/admin/entegrasyonlar"],
];

export function AdminShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-[#f4f1ea] md:grid md:grid-cols-[220px_1fr]">
      <aside className="bg-[#0c1c2e] text-[#f4f1ea] md:min-h-screen">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link href="/admin" className="font-serif text-xl">
            ROTA <span className="text-accent">DE</span>
          </Link>
          <p className="mt-1 text-xs text-white/50">Yönetim</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:px-3">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm whitespace-nowrap text-white/80 hover:bg-white/10">
              {label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="hidden px-3 py-4 md:block">
          <p className="truncate px-3 text-xs text-white/50">{name}</p>
          <Button type="submit" variant="outline" className="mt-3 w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
            Çıkış
          </Button>
        </form>
      </aside>
      <div>
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <p className="truncate text-sm">{name}</p>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">Çıkış</Button>
          </form>
        </div>
        <div className="px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
