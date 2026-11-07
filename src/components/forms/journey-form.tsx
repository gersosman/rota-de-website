"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { track } from "@/lib/analytics-client";
import { submitJourney } from "@/server/actions/intake";
import { Button } from "@/components/ui/button";

type Copy = {
  title: string;
  lead: string;
  back: string;
  next: string;
  submit: string;
  sending: string;
  summary: string;
  successTitle: string;
  successBody: string;
  name: string;
  phone: string;
  city: string;
  email: string;
  preference: string;
  note: string;
  channelTelegram: string;
  channelEmail: string;
  channelPhone: string;
  marketingOpt: string;
  exUnder: string;
  ex13: string;
  ex35: string;
  ex5: string;
  exNone: string;
  ceHave: string;
  cePlan: string;
  srcHave: string;
  srcPlan: string;
  srcInfo: string;
  deNone: string;
  deStart: string;
  deMid: string;
  deGood: string;
  familyAlone: string;
  familySpouse: string;
  familyKids: string;
  spouseQ: string;
  childrenQ: string;
  spouseYes: string;
  spouseNo: string;
  spouseLater: string;
  childrenHint: string;
  papers: string;
  consent: string;
  ack: string;
  errors: { invalid: string; rate: string; origin: string; unavailable: string };
  telegramPending: string;
};

type Step = "ce" | "src3" | "experience" | "german" | "family" | "follow" | "contact" | "summary";

const ORDER: Step[] = ["ce", "src3", "experience", "german", "family", "follow", "contact", "summary"];

const IMAGES: Record<Step, string> = {
  ce: "/photos/scania.jpg",
  src3: "/photos/cabin.jpg",
  experience: "/photos/highway.jpg",
  german: "/photos/city.jpg",
  family: "/photos/family.jpg",
  follow: "/photos/city.jpg",
  contact: "/photos/cabin.jpg",
  summary: "/photos/highway.jpg",
};

export function JourneyForm({
  copy,
  initial,
  telegramHref,
}: {
  copy: Copy;
  initial: Record<string, string>;
  telegramHref: string | null;
}) {
  const [step, setStep] = useState<Step>("ce");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const key = `journey-${useId().replace(/[^a-zA-Z0-9]/g, "")}-rota`;
  const [values, setValues] = useState({
    ce: initial.ce === "planning" ? "planning" : initial.ce === "have" ? "have" : "",
    src3: ["have", "planning", "info"].includes(initial.src3) ? initial.src3 : "",
    experience: "",
    german: ["none", "beginner", "mid", "good"].includes(initial.german) ? initial.german : "",
    family: ["alone", "spouse", "family"].includes(initial.family) ? initial.family : "",
    spouseGerman: ["yes", "no", "unknown"].includes(initial.spouseGerman) ? initial.spouseGerman : "",
    childrenAges: initial.childrenAges ?? "",
    fullName: "",
    phone: "",
    email: "",
    city: "",
    contactPreference: "telegram",
    note: "",
    marketingOptIn: false,
    consent: false,
    disclaimerAck: false,
    companyWebsite: "",
  });

  useEffect(() => {
    track("assessment_start");
  }, []);

  useEffect(() => {
    const send = () => {
      if (!done) track("form_abandon", step);
    };
    window.addEventListener("pagehide", send);
    return () => window.removeEventListener("pagehide", send);
  }, [done, step]);

  const visible = ORDER.filter((item) => item !== "follow" || values.family === "spouse" || values.family === "family");
  const index = Math.max(visible.indexOf(step), 0);

  function pick(field: "ce" | "src3" | "experience" | "german" | "family", value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (field === "ce") track("ce_choice", value);
    if (field === "src3") track("src3_choice", value);
    if (field === "german") track("german_choice", value);
    if (field === "family") track("family_choice", value);
  }

  function ready() {
    if (step === "ce") return Boolean(values.ce);
    if (step === "src3") return Boolean(values.src3);
    if (step === "experience") return Boolean(values.experience);
    if (step === "german") return Boolean(values.german);
    if (step === "family") return Boolean(values.family);
    if (step === "follow") return Boolean(values.spouseGerman);
    if (step === "contact") return values.fullName.trim().length >= 3 && values.phone.trim().length >= 8 && values.city.trim().length >= 2;
    return values.consent && values.disclaimerAck;
  }

  function forward() {
    const next = visible[index + 1];
    if (next) setStep(next);
  }

  function back() {
    const previous = visible[index - 1];
    if (previous) setStep(previous);
  }

  async function send() {
    setPending(true);
    setError(null);
    const result = await submitJourney({
      ...values,
      spouseGerman: values.spouseGerman || undefined,
      childrenAges: values.childrenAges,
      idempotencyKey: key,
    });
    setPending(false);
    if (!result.ok) {
      setError(copy.errors[result.code]);
      return;
    }
    track("form_complete");
    setDone(result.publicCode);
  }

  if (done) {
    return (
      <section className="rota-pop mx-auto max-w-xl px-4 py-16 text-center">
        <p className="font-serif text-4xl text-balance">{copy.successTitle}</p>
        <p className="mt-4 leading-7 text-muted-foreground">{copy.successBody}</p>
        {done ? <p className="mt-6 font-mono text-lg">{done}</p> : null}
        {telegramHref ? (
          <a href={telegramHref} onClick={() => track("telegram_click")} className="mt-8 inline-flex h-12 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">
            Telegram
          </a>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground">{copy.telegramPending}</p>
        )}
      </section>
    );
  }

  const cards = step === "ce"
    ? [["have", copy.ceHave], ["planning", copy.cePlan]]
    : step === "src3"
      ? [["have", copy.srcHave], ["planning", copy.srcPlan], ["info", copy.srcInfo]]
      : step === "experience"
        ? [["under_1", copy.exUnder], ["y1_3", copy.ex13], ["y3_5", copy.ex35], ["y5_plus", copy.ex5], ["none", copy.exNone]]
        : step === "german"
          ? [["none", copy.deNone], ["beginner", copy.deStart], ["mid", copy.deMid], ["good", copy.deGood]]
          : step === "family"
            ? [["alone", copy.familyAlone], ["spouse", copy.familySpouse], ["family", copy.familyKids]]
            : [];

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
      <div className="relative h-64 overflow-hidden rounded-3xl bg-[#0c1c2e] lg:h-auto lg:min-h-[32rem]">
        <Image src={IMAGES[step]} alt="" fill className="rota-drift object-cover opacity-80" sizes="(min-width: 1024px) 40vw, 100vw" />
      </div>
      <div>
        <p className="text-xs tracking-[0.16em] text-accent uppercase">{copy.title}</p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-accent motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${((index + 1) / visible.length) * 100}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{index + 1} / {visible.length}</p>
        <h1 className="mt-4 font-serif text-4xl text-balance">{copy.lead}</h1>
        <div className="mt-6 grid gap-3">
          {cards.map(([id, label]) => {
            const field = step as "ce" | "src3" | "experience" | "german" | "family";
            const selected = values[field] === id;
            return (
              <button key={id} type="button" aria-pressed={selected} onClick={() => pick(field, id)} className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-base ${selected ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"}`}>
                {label}
              </button>
            );
          })}
          {step === "follow" ? (
            <div className="grid gap-4">
              <p className="font-medium">{copy.spouseQ}</p>
              <div className="flex flex-wrap gap-2">
                {[["yes", copy.spouseYes], ["no", copy.spouseNo], ["unknown", copy.spouseLater]].map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={values.spouseGerman === id} onClick={() => setValues({ ...values, spouseGerman: id })} className={`h-12 rounded-full px-4 ${values.spouseGerman === id ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
                    {label}
                  </button>
                ))}
              </div>
              {values.family === "family" ? (
                <label className="text-sm font-medium">
                  {copy.childrenQ}
                  <input value={values.childrenAges} onChange={(event) => setValues({ ...values, childrenAges: event.target.value })} placeholder={copy.childrenHint} className="mt-2 h-12 w-full rounded-2xl border border-border bg-card px-4 text-base" />
                </label>
              ) : null}
            </div>
          ) : null}
          {step === "contact" || step === "summary" ? (
            <div className="grid gap-3">
              {step === "contact" ? (
                <>
                  <input aria-label={copy.name} placeholder={copy.name} value={values.fullName} onChange={(event) => setValues({ ...values, fullName: event.target.value })} className="h-12 rounded-2xl border border-border bg-card px-4 text-base" />
                  <input aria-label={copy.phone} placeholder={copy.phone} inputMode="tel" autoComplete="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} className="h-12 rounded-2xl border border-border bg-card px-4 text-base" />
                  <input aria-label={copy.city} placeholder={copy.city} value={values.city} onChange={(event) => setValues({ ...values, city: event.target.value })} className="h-12 rounded-2xl border border-border bg-card px-4 text-base" />
                  <input aria-label={copy.email} placeholder={copy.email} type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} className="h-12 rounded-2xl border border-border bg-card px-4 text-base" />
                  <label className="text-sm font-medium">
                    {copy.preference}
                    <select aria-label={copy.preference} value={values.contactPreference} onChange={(event) => setValues({ ...values, contactPreference: event.target.value })} className="mt-2 h-12 w-full rounded-2xl border border-border bg-card px-4 text-base">
                      <option value="telegram">{copy.channelTelegram}</option>
                      <option value="email">{copy.channelEmail}</option>
                      <option value="phone">{copy.channelPhone}</option>
                    </select>
                  </label>
                  <textarea aria-label={copy.note} placeholder={copy.note} value={values.note} maxLength={500} onChange={(event) => setValues({ ...values, note: event.target.value })} className="min-h-24 rounded-2xl border border-border bg-card px-4 py-3 text-base" />
                  <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={values.marketingOptIn} onChange={(event) => setValues({ ...values, marketingOptIn: event.target.checked })} />{copy.marketingOpt}</label>
                  <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={values.companyWebsite} onChange={(event) => setValues({ ...values, companyWebsite: event.target.value })} />
                </>
              ) : (
                <>
                  <p className="text-sm leading-6 text-muted-foreground">{copy.summary}: {values.fullName}, {values.city}</p>
                  <p className="text-sm leading-6">{copy.papers}</p>
                  <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={values.consent} onChange={(event) => setValues({ ...values, consent: event.target.checked })} />{copy.consent}</label>
                  <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={values.disclaimerAck} onChange={(event) => setValues({ ...values, disclaimerAck: event.target.checked })} />{copy.ack}</label>
                </>
              )}
            </div>
          ) : null}
        </div>
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          {index > 0 ? <Button type="button" variant="outline" className="h-12 px-5" onClick={back}>{copy.back}</Button> : null}
          {step === "summary" ? (
            <Button type="button" variant="accent" className="h-12 px-5" disabled={!ready() || pending} onClick={() => void send()}>
              {pending ? copy.sending : copy.submit}
            </Button>
          ) : (
            <Button type="button" variant="accent" className="h-12 px-5" disabled={!ready()} onClick={forward}>{copy.next}</Button>
          )}
        </div>
      </div>
    </section>
  );
}
