import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

const links = [
  ["Genel bakış", "/admin"],
  ["Adaylar", "/admin/adaylar"],
  ["Bildirimler", "/admin/bildirimler"],
  ["İletişim", "/admin/iletisim"],
  ["Telegram", "/admin/mesajlar"],
  ["İşverenler", "/admin/isverenler"],
  ["Yorumlar", "/admin/yorumlar"],
  ["İçerik", "/admin/icerik"],
  ["Asistan", "/admin/asistan"],
  ["Durum metinleri", "/admin/durumlar"],
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
    <div className="min-h-full bg-background md:grid md:grid-cols-[220px_1fr]">
      <aside className="bg-hero text-hero-foreground md:min-h-screen">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link href="/admin" className="font-serif text-xl">
            ROTA <span className="text-accent">DE</span>
          </Link>
          <p className="mt-1 text-xs text-hero-muted">Yönetim</p>
          <div className="mt-3">
            <ThemeToggle toDark="Gece modu" toLight="Gündüz modu" />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:px-3">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm whitespace-nowrap text-hero-foreground/80 hover:bg-hero-foreground/10">
              {label}
            </Link>
          ))}
        </nav>
        <form action="/api/admin/oturum" method="post" className="hidden px-3 py-4 md:block">
          <input type="hidden" name="islem" value="cikis" />
          <p className="truncate px-3 text-xs text-hero-muted">{name}</p>
          <Button type="submit" variant="outline" className="mt-3 w-full border-hero-border bg-transparent text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground">
            Çıkış
          </Button>
        </form>
      </aside>
      <div>
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <p className="truncate text-sm">{name}</p>
          <form action="/api/admin/oturum" method="post">
            <input type="hidden" name="islem" value="cikis" />
            <Button type="submit" variant="outline" size="sm">Çıkış</Button>
          </form>
        </div>
        <div className="px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
