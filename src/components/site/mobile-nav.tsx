"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav({ items, cta }: { items: Array<{ href: string; label: string }>; cta: string }) {
  return (
    <Sheet>
      <SheetTrigger
        className="inline-flex size-9 items-center justify-center rounded-lg border border-hero-border text-hero-foreground lg:hidden"
        aria-label="Menü"
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent side="left" className="bg-hero text-hero-foreground">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-serif text-hero-foreground">
            <Image src="/mark.svg" alt="" width={32} height={32} unoptimized className="size-8 rounded-md" />
            ROTA DE
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-2 py-2 text-sm hover:bg-white/5">
              {item.label}
            </Link>
          ))}
          <Button nativeButton={false} variant="accent" className="mt-3 h-11 rounded-full" render={<Link href="/on-degerlendirme" />}>
            {cta}
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
