"use client";

import { useState } from "react";
import Link from "next/link";
import { submitJourney } from "@/server/actions/intake";
import { CityField } from "@/components/forms/city-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Choice = { value: string; label: string };

type Copy = {
  introTitle: string;
  introBody: string;
  why: string;
  start: string;
  back: string;
  next: string;
  progress: string;
  ceTitle: string;
  ceHave: string;
  cePlan: string;
  srcTitle: string;
  srcHave: string;
  srcPlan: string;
  srcInfo: string;
  expTitle: string;
  countryTitle: string;
  countryDetail: string;
  emailHint: string;
  emailInvalid: string;
  contactTitle: string;
  contactBody: string;
  summaryTitle: string;
  summaryNote: string;
  submit: string;
  sending: string;
  successTitle: string;
  successBody: string;
  codeLabel: string;
  copy: string;
  copied: string;
  track: string;
  emailSent: string;
  emailSkipped: string;
  emailFailed: string;
  emailQueued: string;
  emailPending: string;
  papersMail: string;
  noEmail: string;
  channelTitle: string;
  channelHint: string;
  channelNeed: string;
  cityHint: string;
  reference: string;
  duplicate: string;
  name: string;
  phone: string;
  city: string;
  email: string;
  note: string;
  preference: string;
  channelEmail: string;
  channelPhone: string;
  marketing: string;
  consent: string;
  ack: string;
  countries: Record<string, string>;
  experience: Record<string, string>;
  errors: Record<string, string>;
};

const STEPS = ["intro", "country", "ce", "src", "experience", "contact", "summary"] as const;

function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function PrecheckWizard({
  copy,
  initial,
}: {
  copy: Copy;
  initial: { ce?: string; src3?: string };
}) {
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<{ code: string | null; duplicate: boolean; emailStatus?: string } | null>(null);
  const [form, setForm] = useState({
    ce: initial.ce === "planning" || initial.ce === "have" ? initial.ce : "",
    src3: initial.src3 === "have" || initial.src3 === "planning" || initial.src3 === "info" ? initial.src3 : "",
    experience: "",
    residence: "",
    residenceDetail: "",
    fullName: "",
    city: "",
    email: "",
    note: "",
    marketing: false,
    consent: false,
    ack: false,
  });

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  const current = STEPS[step] ?? "intro";
  const countryReady = form.residence === "TR" || (form.residence === "OTHER" && form.residenceDetail.trim().length >= 2);
  const ready: Record<(typeof STEPS)[number], boolean> = {
    intro: true,
    country: countryReady,
    ce: form.ce === "have" || form.ce === "planning",
    src: form.src3 === "have" || form.src3 === "planning" || form.src3 === "info",
    experience: Boolean(form.experience),
    contact:
      form.fullName.trim().length >= 3 &&
      form.city.trim().length >= 2 &&
      emailOk(form.email) &&
      form.consent &&
      form.ack,
    summary: true,
  };

  async function send() {
    if (!emailOk(form.email)) {
      setError(copy.emailInvalid);
      return;
    }
    setPending(true);
    setError(null);
    const storageKey = "rota-journey-key";
    let idempotencyKey = `journey-${crypto.randomUUID()}`;
    try {
      const existing = window.sessionStorage.getItem(storageKey);
      if (existing && existing.length >= 8) idempotencyKey = existing;
      else window.sessionStorage.setItem(storageKey, idempotencyKey);
    } catch {
      /* private mode keeps the in-memory key */
    }
    let result: Awaited<ReturnType<typeof submitJourney>>;
    try {
      result = await submitJourney({
        ce: form.ce,
        src3: form.src3,
        experience: form.experience,
        residence: form.residence,
        residenceDetail: form.residence === "OTHER" ? form.residenceDetail.trim() : undefined,
        fullName: form.fullName,
        email: form.email.trim(),
        city: form.city,
        channels: ["email"],
        contactPreference: "email",
        note: form.note,
        marketingOptIn: form.marketing,
        consent: true,
        disclaimerAck: true,
        idempotencyKey,
        companyWebsite: website,
      });
    } catch {
      const ref = crypto.randomUUID().slice(0, 8);
      const base = copy.errors.unavailable ?? "";
      setError(base ? `${base} ${copy.reference}: ${ref}` : ref);
      setPending(false);
      return;
    }
    setPending(false);
    if (!result.ok) {
      const base = copy.errors[result.code] ?? copy.errors.unavailable ?? "";
      const ref = "ref" in result && result.ref ? `${copy.reference}: ${result.ref}` : "";
      setError(ref ? `${base} ${ref}` : base || copy.emailInvalid);
      return;
    }
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setDone({ code: result.publicCode, duplicate: result.duplicate, emailStatus: "emailStatus" in result ? result.emailStatus : undefined });
  }

  if (done) {
    const mail = done.duplicate
      ? ""
      : done.emailStatus === "sent"
        ? copy.emailSent
        : done.emailStatus === "pending"
          ? copy.emailPending
          : done.emailStatus === "failed"
            ? copy.emailFailed
            : "";
    return (
      <section className="mx-auto max-w-xl px-4 py-16">
        <p className="font-serif text-4xl leading-tight">{copy.successTitle}</p>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{copy.successBody}</p>
        {done.code ? (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{copy.codeLabel}</p>
            <p className="mt-2 font-mono text-3xl text-accent">{done.code}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-12"
              onClick={async () => {
                await navigator.clipboard.writeText(done.code ?? "");
                setCopied(true);
              }}
            >
              {copied ? copy.copied : copy.copy}
            </Button>
          </div>
        ) : null}
        {done.duplicate ? <p className="mt-4 text-sm">{copy.duplicate}</p> : null}
        <p className="mt-4 text-sm leading-6">{mail}</p>
        <Link href="/basvuru-takip" className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-accent px-8 text-base font-medium text-accent-foreground">{copy.track}</Link>
      </section>
    );
  }

  const countryName = form.residence === "OTHER" ? form.residenceDetail.trim() : copy.countries[form.residence];

  return (
    <section className="mx-auto max-w-xl px-4 py-12 md:py-16">
      <p className="text-xs tracking-[0.16em] text-accent uppercase">{copy.progress} {step + 1} / {STEPS.length}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-accent" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <div className="mt-8">
        {current === "intro" ? (
          <>
            <h1 className="font-serif text-4xl leading-tight text-balance md:text-5xl">{copy.introTitle}</h1>
            <p className="mt-5 text-lg leading-8">{copy.introBody}</p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy.why}</p>
          </>
        ) : null}
        {current === "country" ? (
          <div>
            <Chooser
              title={copy.countryTitle}
              value={form.residence}
              onChange={(value) => {
                set("residence", value);
                if (value !== "OTHER") set("residenceDetail", "");
              }}
              options={[
                { value: "TR", label: copy.countries.TR ?? "Türkiye" },
                { value: "OTHER", label: copy.countries.OTHER ?? "Diğer" },
              ]}
            />
            {form.residence === "OTHER" ? (
              <Input
                value={form.residenceDetail}
                onChange={(event) => set("residenceDetail", event.target.value)}
                placeholder={copy.countryDetail}
                className="mt-4 h-12"
                autoComplete="country-name"
              />
            ) : null}
          </div>
        ) : null}
        {current === "ce" ? <Chooser title={copy.ceTitle} value={form.ce} onChange={(value) => set("ce", value)} options={[{ value: "have", label: copy.ceHave }, { value: "planning", label: copy.cePlan }]} /> : null}
        {current === "src" ? <Chooser title={copy.srcTitle} value={form.src3} onChange={(value) => set("src3", value)} options={[{ value: "have", label: copy.srcHave }, { value: "planning", label: copy.srcPlan }, { value: "info", label: copy.srcInfo }]} /> : null}
        {current === "experience" ? <Chooser title={copy.expTitle} value={form.experience} onChange={(value) => set("experience", value)} options={Object.entries(copy.experience).map(([value, label]) => ({ value, label }))} /> : null}
        {current === "contact" ? (
          <div>
            <h1 className="font-serif text-4xl leading-tight">{copy.contactTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.contactBody}</p>
            <div className="mt-6 grid gap-4">
              <Input value={form.fullName} onChange={(event) => set("fullName", event.target.value)} placeholder={copy.name} className="h-12" autoComplete="name" />
              <CityField
                value={form.city}
                onChange={(value) => set("city", value)}
                label={copy.city}
                hint={copy.cityHint}
                countryLabel={{ DE: copy.countries.DE ?? "DE", TR: copy.countries.TR ?? "TR" }}
              />
              <div>
                <Input value={form.email} onChange={(event) => set("email", event.target.value)} placeholder={copy.email} className="h-12" type="email" autoComplete="email" required />
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.emailHint}</p>
                {form.email && !emailOk(form.email) ? <p className="mt-1 text-sm text-destructive">{copy.emailInvalid}</p> : null}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{copy.papersMail}</p>
              <Textarea value={form.note} onChange={(event) => set("note", event.target.value)} placeholder={copy.note} />
              <label className="flex gap-3 text-sm leading-6"><input type="checkbox" checked={form.consent} onChange={(event) => set("consent", event.target.checked)} />{copy.consent}</label>
              <label className="flex gap-3 text-sm leading-6"><input type="checkbox" checked={form.ack} onChange={(event) => set("ack", event.target.checked)} />{copy.ack}</label>
              <label className="flex gap-3 text-sm leading-6 text-muted-foreground"><input type="checkbox" checked={form.marketing} onChange={(event) => set("marketing", event.target.checked)} />{copy.marketing}</label>
            </div>
          </div>
        ) : null}
        {current === "summary" ? (
          <div>
            <h1 className="font-serif text-4xl leading-tight">{copy.summaryTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.summaryNote}</p>
            <ul className="mt-6 space-y-2 rounded-3xl border border-border bg-card p-5 text-sm leading-6">
              <li>{copy.countryTitle} {countryName}</li>
              <li>{copy.ceTitle} {form.ce === "have" ? copy.ceHave : copy.cePlan}</li>
              <li>{copy.srcTitle} {form.src3 === "have" ? copy.srcHave : form.src3 === "planning" ? copy.srcPlan : copy.srcInfo}</li>
              <li>{copy.expTitle} {copy.experience[form.experience]}</li>
              <li>{form.fullName} · {form.city}</li>
              <li>{form.email}</li>
            </ul>
          </div>
        ) : null}
      </div>
      <input className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(event) => setWebsite(event.target.value)} />
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {step > 0 ? <Button type="button" variant="outline" className="h-14 w-full rounded-full px-6 sm:w-auto" onClick={() => setStep((value) => value - 1)}>{copy.back}</Button> : null}
        {current !== "summary" ? (
          <Button type="button" variant="accent" className="h-14 w-full rounded-full px-8 text-base sm:w-auto" disabled={!ready[current]} onClick={() => setStep((value) => value + 1)}>
            {current === "intro" ? copy.start : copy.next}
          </Button>
        ) : (
          <Button type="button" variant="accent" className="h-14 w-full rounded-full px-8 text-base sm:w-auto" disabled={pending} onClick={send}>{pending ? copy.sending : copy.submit}</Button>
        )}
      </div>
    </section>
  );
}

function Chooser({ title, value, options, onChange }: { title: string; value: string; options: Choice[]; onChange: (value: string) => void }) {
  return (
    <div>
      <h1 className="font-serif text-4xl leading-tight text-balance">{title}</h1>
      <div className="mt-6 grid gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-14 rounded-2xl border px-4 py-4 text-left text-base ${value === option.value ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent/40"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
