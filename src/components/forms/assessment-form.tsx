"use client";

import { useId, useMemo, useState } from "react";
import { submitAssessment } from "@/server/actions/intake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { licenceClasses } from "@/lib/validation/assessment";

type Copy = {
  next: string;
  back: string;
  submit: string;
  sending: string;
  step: string;
  doneTitle: string;
  doneBody: string;
  duplicate: string;
  errorInvalid: string;
  errorRate: string;
  errorOrigin: string;
  errorUnavailable: string;
  consent: string;
  ack: string;
  questions: string[];
  options: Record<string, string>;
};

export function AssessmentForm({ copy }: { copy: Copy }) {
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ publicCode: string | null; duplicate: boolean } | null>(null);
  const key = `intake-${useId().replace(/[^a-zA-Z0-9]/g, "")}-rota`;
  const [licence, setLicence] = useState<string[]>([]);
  const [values, setValues] = useState({
    residenceCountry: "",
    residenceDetail: "",
    ageRange: "",
    licenceCountry: "",
    licenceCountryDetail: "",
    hasCe: "",
    euEeaLicence: "",
    code95: "",
    experienceRange: "",
    germanLevel: "",
    intent: "",
    fullName: "",
    email: "",
    contactPreference: "email",
    phone: "",
    telegramHandle: "",
    instagramHandle: "",
    consent: false,
    disclaimerAck: false,
    companyWebsite: "",
  });

  const total = copy.questions.length;
  const choice = (name: keyof typeof values, options: string[]) => (
    <div className="grid gap-2">
      {options.map((option) => (
        <label key={option} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-sm">
          <input
            type="radio"
            name={name}
            value={option}
            checked={values[name] === option}
            onChange={() => setValues((current) => ({ ...current, [name]: option }))}
          />
          {copy.options[option] ?? option}
        </label>
      ))}
    </div>
  );

  const canAdvance = useMemo(() => {
    if (step === 0) return values.residenceCountry !== "" && (values.residenceCountry !== "OTHER" || values.residenceDetail.trim().length > 0);
    if (step === 1) return values.ageRange !== "";
    if (step === 2) return licence.length > 0;
    if (step === 3) return values.licenceCountry !== "" && (values.licenceCountry !== "OTHER" || values.licenceCountryDetail.trim().length > 0);
    if (step === 4) return values.hasCe === "yes" || values.hasCe === "no";
    if (step === 5) return values.euEeaLicence !== "";
    if (step === 6) return values.code95 !== "";
    if (step === 7) return values.experienceRange !== "";
    if (step === 8) return values.germanLevel !== "";
    if (step === 9) return values.intent !== "";
    return values.fullName.trim().length >= 3 && values.email.includes("@") && values.consent && values.disclaimerAck;
  }, [step, values, licence]);

  async function finish() {
    setPending(true);
    setError(null);
    const result = await submitAssessment({
      ...values,
      licenceClasses: licence,
      idempotencyKey: key,
      consent: values.consent ? true : false,
      disclaimerAck: values.disclaimerAck ? true : false,
    });
    setPending(false);
    if (!result.ok) {
      const map = {
        invalid: copy.errorInvalid,
        rate: copy.errorRate,
        origin: copy.errorOrigin,
        unavailable: copy.errorUnavailable,
      } as const;
      setError(map[result.code] ?? copy.errorUnavailable);
      return;
    }
    setDone({ publicCode: result.publicCode, duplicate: result.duplicate });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-serif text-3xl">{copy.doneTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.doneBody}</p>
        {done.duplicate ? <p className="mt-3 text-sm">{copy.duplicate}</p> : null}
        {done.publicCode ? <p className="mt-6 font-mono text-2xl text-accent">{done.publicCode}</p> : null}
      </div>
    );
  }

  return (
    <form
      className="rounded-2xl border border-border bg-card p-5 md:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        if (step < total - 1) {
          if (canAdvance) setStep((current) => current + 1);
          return;
        }
        if (canAdvance) void finish();
      }}
    >
      <p className="text-xs tracking-[0.16em] text-accent uppercase">
        {copy.step} {step + 1} / {total}
      </p>
      <h2 className="mt-3 font-serif text-3xl leading-tight">{copy.questions[step]}</h2>
      <div className="mt-6">
        {step === 0 ? (
          <div className="space-y-3">
            {choice("residenceCountry", ["TR", "DE", "EU_EEA_OTHER", "OTHER"])}
            {values.residenceCountry === "OTHER" ? (
              <Input className="h-11" placeholder={copy.options.detail} value={values.residenceDetail} onChange={(event) => setValues({ ...values, residenceDetail: event.target.value })} />
            ) : null}
          </div>
        ) : null}
        {step === 1 ? choice("ageRange", ["18_20", "21_24", "25_34", "35_44", "45_54", "55_plus", "undisclosed"]) : null}
        {step === 2 ? (
          <div className="grid grid-cols-2 gap-2">
            {licenceClasses.map((item) => (
              <label key={item} className="flex items-center gap-2 rounded-lg border border-border px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={licence.includes(item)}
                  onChange={(event) =>
                    setLicence((current) =>
                      event.target.checked ? [...current, item] : current.filter((value) => value !== item),
                    )
                  }
                />
                {item}
              </label>
            ))}
          </div>
        ) : null}
        {step === 3 ? (
          <div className="space-y-3">
            {choice("licenceCountry", ["TR", "DE", "EU_EEA_OTHER", "OTHER"])}
            {values.licenceCountry === "OTHER" ? (
              <Input className="h-11" placeholder={copy.options.detail} value={values.licenceCountryDetail} onChange={(event) => setValues({ ...values, licenceCountryDetail: event.target.value })} />
            ) : null}
          </div>
        ) : null}
        {step === 4 ? choice("hasCe", ["yes", "no"]) : null}
        {step === 5 ? choice("euEeaLicence", ["yes", "no", "unknown"]) : null}
        {step === 6 ? choice("code95", ["yes", "no", "unknown"]) : null}
        {step === 7 ? choice("experienceRange", ["none", "under_1", "y1_3", "y3_5", "y5_plus"]) : null}
        {step === 8 ? choice("germanLevel", ["none", "A1", "A2", "B1", "B2", "C1_plus"]) : null}
        {step === 9 ? choice("intent", ["work_in_germany", "change_job", "both", "unsure"]) : null}
        {step === 10 ? (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fullName">{copy.options.fullName}</Label>
              <Input id="fullName" className="h-11" value={values.fullName} onChange={(event) => setValues({ ...values, fullName: event.target.value })} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">{copy.options.emailAddress}</Label>
              <Input id="email" type="email" className="h-11" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} required />
            </div>
            <p className="text-sm text-muted-foreground">{copy.options.email}</p>
            <label className="flex items-start gap-3 text-sm leading-6">
              <input type="checkbox" className="mt-1" checked={values.consent} onChange={(event) => setValues({ ...values, consent: event.target.checked })} />
              {copy.consent}
            </label>
            <label className="flex items-start gap-3 text-sm leading-6">
              <input type="checkbox" className="mt-1" checked={values.disclaimerAck} onChange={(event) => setValues({ ...values, disclaimerAck: event.target.checked })} />
              {copy.ack}
            </label>
            <input className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" aria-hidden="true" value={values.companyWebsite} onChange={(event) => setValues({ ...values, companyWebsite: event.target.value })} />
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-8 flex justify-between gap-3">
        <Button type="button" variant="outline" className="h-11 px-4" disabled={step === 0 || pending} onClick={() => setStep((current) => current - 1)}>
          {copy.back}
        </Button>
        <Button type="submit" variant="accent" className="h-11 px-5" disabled={!canAdvance || pending || !key}>
          {pending ? copy.sending : step === total - 1 ? copy.submit : copy.next}
        </Button>
      </div>
    </form>
  );
}
