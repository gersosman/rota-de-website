"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav({ items, cta }: { items: Array<{ href: string; label: string }>; cta: string }) {
  return (
    <Sheet>
      <SheetTrigger
        className="inline-flex size-9 items-center justify-center rounded-lg border border-white/15 lg:hidden"
        aria-label="Menü"
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent side="left" className="bg-[#0c1c2e] text-[#f4f1ea]">
        <SheetHeader>
          <SheetTitle className="font-serif text-[#f4f1ea]">ROTA DE</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-2 py-2 text-sm hover:bg-white/5">
              {item.label}
            </Link>
          ))}
          <Button nativeButton={false} variant="accent" className="mt-3 h-10" render={<Link href="/on-degerlendirme" />}>
            {cta}
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
