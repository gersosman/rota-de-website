"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics-client";

type Copy = {
  ceTitle: string;
  ceHave: string;
  cePlan: string;
  ceHaveBody: string;
  cePlanBody: string;
  go: string;
  srcTitle: string;
  srcHave: string;
  srcPlan: string;
  srcInfo: string;
  srcHaveBody: string;
  srcPlanBody: string;
  srcInfoBody: string;
  deTitle: string;
  deLead: string;
  deNone: string;
  deStart: string;
  deMid: string;
  deGood: string;
  familyTitle: string;
  familyAlone: string;
  familySpouse: string;
  familyKids: string;
  spouseQ: string;
  childrenQ: string;
  spouseYes: string;
  spouseNo: string;
  spouseLater: string;
  childrenHint: string;
  lines: string[];
  photoScania: string;
  photoCabin: string;
  photoYard: string;
  photoCity: string;
  photoFamily: string;
};

type Prefill = Record<string, string>;

function remember(partial: Prefill) {
  try {
    const current = sessionStorage.getItem("rota-prefill");
    const parsed = current ? (JSON.parse(current) as Prefill) : {};
    sessionStorage.setItem("rota-prefill", JSON.stringify({ ...parsed, ...partial }));
  } catch {
    sessionStorage.setItem("rota-prefill", JSON.stringify(partial));
  }
}

export function HomeStories({ copy }: { copy: Copy }) {
  const [ce, setCe] = useState("");
  const [src, setSrc] = useState("");
  const [german, setGerman] = useState("");
  const [family, setFamily] = useState("");
  const [spouse, setSpouse] = useState("");
  const [children, setChildren] = useState("");

  useEffect(() => {
    track("home_view");
  }, []);

  const href = (extra: Prefill) => {
    const params = new URLSearchParams(extra);
    return `/on-degerlendirme?${params.toString()}`;
  };

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="max-w-xl font-serif text-4xl text-balance">{copy.ceTitle}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Choice
            image="/photos/scania.jpg"
            alt={copy.photoScania}
            label={copy.ceHave}
            body={copy.ceHaveBody}
            selected={ce === "have"}
            onSelect={() => {
              setCe("have");
              remember({ ce: "have" });
              track("ce_choice", "have");
            }}
          />
          <Choice
            image="/photos/cabin.jpg"
            alt={copy.photoCabin}
            label={copy.cePlan}
            body={copy.cePlanBody}
            selected={ce === "planning"}
            onSelect={() => {
              setCe("planning");
              remember({ ce: "planning" });
              track("ce_choice", "planning");
            }}
          />
        </div>
        {ce ? (
          <Link href={href({ ce })} className="mt-6 inline-flex h-12 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">
            {copy.go}
          </Link>
        ) : null}
      </section>
      <section className="bg-[#0c1c2e] text-[#f4f1ea]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-serif text-4xl text-balance">{copy.srcTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["have", copy.srcHave, copy.srcHaveBody, "/photos/scania.jpg", copy.photoScania],
              ["planning", copy.srcPlan, copy.srcPlanBody, "/photos/scania.jpg", copy.photoScania],
              ["info", copy.srcInfo, copy.srcInfoBody, "/photos/city.jpg", copy.photoCity],
            ].map(([id, label, body, image, alt]) => (
              <Choice
                key={id}
                image={image}
                alt={alt}
                label={label}
                body={body}
                dark
                selected={src === id}
                onSelect={() => {
                  setSrc(id);
                  remember({ src3: id });
                  track("src3_choice", id);
                }}
              />
            ))}
          </div>
          {src ? (
            <Link href={href({ src3: src })} className="mt-6 inline-flex h-12 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">
              {copy.go}
            </Link>
          ) : null}
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2">
        <div className="relative h-80 overflow-hidden rounded-3xl">
          <Image src="/photos/city.jpg" alt={copy.photoCity} fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
        </div>
        <div>
          <h2 className="font-serif text-4xl text-balance">{copy.deTitle}</h2>
          <p className="mt-4 leading-7 text-muted-foreground">{copy.deLead}</p>
          <div className="mt-6 grid gap-2">
            {[
              ["none", copy.deNone],
              ["beginner", copy.deStart],
              ["mid", copy.deMid],
              ["good", copy.deGood],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={german === id}
                onClick={() => {
                  setGerman(id);
                  remember({ german: id });
                  track("german_choice", id);
                }}
                className={`h-12 rounded-2xl border px-4 text-left text-sm ${german === id ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {german ? (
            <Link href={href({ german })} className="mt-6 inline-flex h-12 items-center rounded-full bg-[#0c1c2e] px-5 text-sm text-[#f4f1ea]">
              {copy.go}
            </Link>
          ) : null}
        </div>
      </section>
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-serif text-4xl text-balance">{copy.familyTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["alone", copy.familyAlone, "/photos/highway.jpg", copy.photoScania],
              ["spouse", copy.familySpouse, "/photos/city.jpg", copy.photoCity],
              ["family", copy.familyKids, "/photos/family.jpg", copy.photoFamily],
            ].map(([id, label, image, alt]) => (
              <Choice
                key={id}
                image={image}
                alt={alt}
                label={label}
                body=""
                selected={family === id}
                onSelect={() => {
                  setFamily(id);
                  remember({ family: id });
                  track("family_choice", id);
                }}
              />
            ))}
          </div>
          {family === "spouse" || family === "family" ? (
            <div className="mt-6 grid gap-4 rounded-3xl border border-border p-5 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">{copy.spouseQ}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    ["yes", copy.spouseYes],
                    ["no", copy.spouseNo],
                    ["unknown", copy.spouseLater],
                  ].map(([id, label]) => (
                    <button key={id} type="button" aria-pressed={spouse === id} onClick={() => { setSpouse(id); remember({ spouseGerman: id }); }} className={`h-11 rounded-full px-4 text-sm ${spouse === id ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {family === "family" ? (
                <label className="text-sm font-medium">
                  {copy.childrenQ}
                  <input value={children} onChange={(event) => { setChildren(event.target.value); remember({ childrenAges: event.target.value }); }} placeholder={copy.childrenHint} className="mt-3 h-12 w-full rounded-2xl border border-border bg-background px-4 text-base" />
                </label>
              ) : null}
            </div>
          ) : null}
          {family ? (
            <Link href={href({ family, ...(spouse ? { spouseGerman: spouse } : {}), ...(children ? { childrenAges: children } : {}) })} className="mt-6 inline-flex h-12 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">
              {copy.go}
            </Link>
          ) : null}
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-2">
        {copy.lines.map((line, index) => (
          <p key={line} className={`rounded-3xl p-6 font-serif text-2xl leading-snug text-balance ${index % 2 ? "bg-[#0c1c2e] text-[#f4f1ea]" : "bg-card"}`}>
            {line}
          </p>
        ))}
      </section>
    </>
  );
}

function Choice({
  image,
  alt,
  label,
  body,
  selected,
  dark,
  onSelect,
}: {
  image: string;
  alt: string;
  label: string;
  body: string;
  selected: boolean;
  dark?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`overflow-hidden rounded-3xl border text-left transition motion-safe:hover:-translate-y-1 ${selected ? "border-accent ring-2 ring-accent" : "border-transparent"} ${dark ? "bg-white/5" : "bg-card"}`}
    >
      <span className="relative block h-52">
        <Image src={image} alt={alt} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" />
      </span>
      <div className="p-5">
        <p className="font-serif text-2xl">{label}</p>
        {body ? <p className={`mt-2 text-sm leading-6 ${dark ? "text-white/70" : "text-muted-foreground"}`}>{body}</p> : null}
      </div>
    </button>
  );
}
