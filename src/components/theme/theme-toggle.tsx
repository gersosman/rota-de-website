"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function currentDark() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle({ toDark, toLight }: { toDark: string; toLight: string }) {
  const dark = useSyncExternalStore(subscribe, currentDark, () => false);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("rota-theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? toLight : toDark}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-3 text-sm text-white/80 hover:text-white"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="hidden sm:inline">{dark ? toLight : toDark}</span>
    </button>
  );
}
