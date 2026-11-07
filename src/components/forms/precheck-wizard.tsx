"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { submitJourney } from "@/server/actions/intake";
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
  germanTitle: string;
  germanNone: string;
  germanStart: string;
  germanMid: string;
  germanGood: string;
  whenTitle: string;
  whenNow: string;
  when13: string;
  when36: string;
  whenLater: string;
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
  noEmail: string;
  duplicate: string;
  name: string;
  phone: string;
  city: string;
  email: string;
  note: string;
  preference: string;
  channelEmail: string;
  channelPhone: string;
  channelTelegram: string;
  marketing: string;
  consent: string;
  ack: string;
  countries: Record<string, string>;
  experience: Record<string, string>;
  errors: Record<string, string>;
};

const STEPS = ["intro", "ce", "src", "experience", "country", "german", "when", "contact", "summary"] as const;

export function PrecheckWizard({
  copy,
  initial,
}: {
  copy: Copy;
  initial: { ce?: string; src3?: string; german?: string; family?: string };
}) {
  const key = `journey-${useId().replace(/[^a-zA-Z0-9]/g, "")}-rota`;
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
    german: initial.german === "none" || initial.german === "beginner" || initial.german === "mid" || initial.german === "good" ? initial.german : "",
    availability: "",
    fullName: "",
    phone: "",
    city: "",
    email: "",
    contactPreference: "phone",
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
  const ready: Record<(typeof STEPS)[number], boolean> = {
    intro: true,
    ce: form.ce === "have" || form.ce === "planning",
    src: form.src3 === "have" || form.src3 === "planning" || form.src3 === "info",
    experience: Boolean(form.experience),
    country: Boolean(form.residence),
    german: Boolean(form.german),
    when: Boolean(form.availability),
    contact: form.fullName.trim().length >= 3 && form.phone.replace(/\D/g, "").length >= 8 && form.city.trim().length >= 2 && form.consent && form.ack && (form.contactPreference !== "email" || form.email.includes("@")),
    summary: true,
  };

  async function send() {
    setPending(true);
    setError(null);
    const result = await submitJourney({
      ce: form.ce,
      src3: form.src3,
      experience: form.experience,
      german: form.german,
      family: "alone",
      residence: form.residence,
      availability: form.availability,
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      city: form.city,
      contactPreference: form.contactPreference,
      note: form.note,
      marketingOptIn: form.marketing,
      consent: true,
      disclaimerAck: true,
      idempotencyKey: key,
      companyWebsite: website,
    });
    setPending(false);
    if (!result.ok) {
      setError(copy.errors[result.code] ?? copy.errors.unavailable ?? "");
      return;
    }
    setDone({ code: result.publicCode, duplicate: result.duplicate, emailStatus: "emailStatus" in result ? result.emailStatus : undefined });
  }

  if (done) {
    const mail = done.emailStatus === "sent" ? copy.emailSent : done.emailStatus === "failed" ? copy.emailFailed : done.emailStatus === "skipped" ? copy.emailSkipped : copy.noEmail;
    return (
      <section className="mx-auto max-w-xl px-4 py-16">
        <p className="font-serif text-4xl leading-tight">{copy.successTitle}</p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy.successBody}</p>
        {done.code ? (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{copy.codeLabel}</p>
            <p className="mt-2 font-mono text-3xl text-accent">{done.code}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-11"
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
        <Link href="/basvuru-takip" className="mt-8 inline-flex h-12 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">{copy.track}</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <p className="text-xs tracking-[0.16em] text-accent uppercase">{copy.progress} {step + 1} / {STEPS.length}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-accent" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <div className="mt-8">
        {current === "intro" ? (
          <>
            <h1 className="font-serif text-4xl leading-tight">{copy.introTitle}</h1>
            <p className="mt-4 text-base leading-7">{copy.introBody}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.why}</p>
          </>
        ) : null}
        {current === "ce" ? <Chooser title={copy.ceTitle} value={form.ce} onChange={(value) => set("ce", value)} options={[{ value: "have", label: copy.ceHave }, { value: "planning", label: copy.cePlan }]} /> : null}
        {current === "src" ? <Chooser title={copy.srcTitle} value={form.src3} onChange={(value) => set("src3", value)} options={[{ value: "have", label: copy.srcHave }, { value: "planning", label: copy.srcPlan }, { value: "info", label: copy.srcInfo }]} /> : null}
        {current === "experience" ? <Chooser title={copy.expTitle} value={form.experience} onChange={(value) => set("experience", value)} options={Object.entries(copy.experience).map(([value, label]) => ({ value, label }))} /> : null}
        {current === "country" ? <Chooser title={copy.countryTitle} value={form.residence} onChange={(value) => set("residence", value)} options={["TR", "DE", "EU_EEA_OTHER", "OTHER"].map((value) => ({ value, label: copy.countries[value] ?? value }))} /> : null}
        {current === "german" ? <Chooser title={copy.germanTitle} value={form.german} onChange={(value) => set("german", value)} options={[{ value: "none", label: copy.germanNone }, { value: "beginner", label: copy.germanStart }, { value: "mid", label: copy.germanMid }, { value: "good", label: copy.germanGood }]} /> : null}
        {current === "when" ? <Chooser title={copy.whenTitle} value={form.availability} onChange={(value) => set("availability", value)} options={[{ value: "now", label: copy.whenNow }, { value: "m1_3", label: copy.when13 }, { value: "m3_6", label: copy.when36 }, { value: "later", label: copy.whenLater }]} /> : null}
        {current === "contact" ? (
          <div>
            <h1 className="font-serif text-4xl leading-tight">{copy.contactTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.contactBody}</p>
            <div className="mt-6 grid gap-3">
              <Input value={form.fullName} onChange={(event) => set("fullName", event.target.value)} placeholder={copy.name} className="h-12" />
              <Input value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder={copy.phone} className="h-12" inputMode="tel" />
              <Input value={form.city} onChange={(event) => set("city", event.target.value)} placeholder={copy.city} className="h-12" />
              <Input value={form.email} onChange={(event) => set("email", event.target.value)} placeholder={copy.email} className="h-12" type="email" />
              <div className="grid gap-2">
                {([
                  ["phone", copy.channelPhone],
                  ["email", copy.channelEmail],
                  ["telegram", copy.channelTelegram],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => set("contactPreference", value)} className={`rounded-2xl border px-4 py-3 text-left text-sm ${form.contactPreference === value ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
                    {label}
                  </button>
                ))}
              </div>
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
              <li>{copy.ceTitle} {form.ce === "have" ? copy.ceHave : copy.cePlan}</li>
              <li>{copy.srcTitle} {form.src3 === "have" ? copy.srcHave : form.src3 === "planning" ? copy.srcPlan : copy.srcInfo}</li>
              <li>{copy.expTitle} {copy.experience[form.experience]}</li>
              <li>{copy.countryTitle} {copy.countries[form.residence]}</li>
              <li>{copy.germanTitle} {form.german}</li>
              <li>{copy.whenTitle} {form.availability}</li>
              <li>{form.fullName} · {form.city}</li>
            </ul>
          </div>
        ) : null}
      </div>
      <input className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-8 flex gap-3">
        {step > 0 ? <Button type="button" variant="outline" className="h-12" onClick={() => setStep((value) => value - 1)}>{copy.back}</Button> : null}
        {current !== "summary" ? (
          <Button type="button" variant="accent" className="h-12" disabled={!ready[current]} onClick={() => setStep((value) => value + 1)}>
            {current === "intro" ? copy.start : copy.next}
          </Button>
        ) : (
          <Button type="button" variant="accent" className="h-12" disabled={pending} onClick={send}>{pending ? copy.sending : copy.submit}</Button>
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
            className={`rounded-2xl border px-4 py-4 text-left text-base ${value === option.value ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent/40"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
