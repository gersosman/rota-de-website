"use client";

import { useId, useMemo, useRef, useState } from "react";
import { suggestCities } from "@/lib/cities";
import { Input } from "@/components/ui/input";

export function CityField({
  value,
  onChange,
  label,
  hint,
  countryLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  hint: string;
  countryLabel: { DE: string; TR: string };
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | null>(null);
  const matches = useMemo(() => suggestCities(value), [value]);
  const visible = open && value.trim().length >= 2 && matches.length > 0;

  function choose(name: string) {
    onChange(name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        value={value}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible ? `${listId}-${active}` : undefined}
        placeholder={label}
        autoComplete="off"
        className="h-12"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 120);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!visible) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => (current + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => (current - 1 + matches.length) % matches.length);
          } else if (event.key === "Enter" && matches[active]) {
            event.preventDefault();
            choose(matches[active].n);
          }
        }}
      />
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{hint}</p>
      {visible ? (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-border bg-popover p-1 shadow-lg">
          {matches.map((city, index) => (
            <li key={`${city.c}-${city.n}`} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm ${index === active ? "bg-accent/15" : "hover:bg-muted"}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (blurTimer.current) window.clearTimeout(blurTimer.current);
                  choose(city.n);
                }}
              >
                <span>{city.n}</span>
                <span className="text-xs text-muted-foreground">{countryLabel[city.c]}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
