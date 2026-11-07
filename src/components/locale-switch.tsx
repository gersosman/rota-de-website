"use client";

import { usePathname } from "next/navigation";
import { setLocaleAction } from "@/server/actions/locale";

export function LocaleSwitch({ locale }: { locale: "tr" | "de" }) {
  const pathname = usePathname();
  return (
    <form action={setLocaleAction} className="flex items-center rounded-full border border-hero-border bg-hero-foreground/5 p-0.5 text-xs">
      <input type="hidden" name="next" value={pathname} />
      <button
        name="locale"
        value="tr"
        className={`rounded-full px-2.5 py-1 ${locale === "tr" ? "bg-accent text-accent-foreground" : "text-hero-muted"}`}
        type="submit"
      >
        TR
      </button>
      <button
        name="locale"
        value="de"
        className={`rounded-full px-2.5 py-1 ${locale === "de" ? "bg-accent text-accent-foreground" : "text-hero-muted"}`}
        type="submit"
      >
        DE
      </button>
    </form>
  );
}
