"use client";

import { useId, useState } from "react";
import { submitContact } from "@/server/actions/intake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm({
  labels,
}: {
  labels: {
    fullName: string;
    email: string;
    message: string;
    preference: string;
    consent: string;
    submit: string;
    done: string;
    code: string;
    options: Record<string, string>;
    errors: Record<string, string>;
  };
}) {
  const key = `contact-${useId().replace(/[^a-zA-Z0-9]/g, "")}-rota`;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [website, setWebsite] = useState("");

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p>{labels.done}</p>
        {done !== "hidden" ? <p className="mt-4 font-mono text-xl text-accent">{done}</p> : null}
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-2xl border border-border bg-card p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        const result = await submitContact({
          fullName: form.get("fullName"),
          email: form.get("email"),
          message: form.get("message"),
          contactPreference: form.get("contactPreference"),
          phone: "",
          consent: form.get("consent") === "on" ? true : false,
          idempotencyKey: key,
          companyWebsite: website,
        });
        setPending(false);
        if (!result.ok) {
          setError(labels.errors[result.code] ?? labels.errors.unavailable);
          return;
        }
        setDone(result.publicCode ?? "hidden");
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="fullName">{labels.fullName}</Label>
        <Input id="fullName" name="fullName" className="h-11" required minLength={3} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">{labels.email}</Label>
        <Input id="email" name="email" type="email" className="h-11" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="message">{labels.message}</Label>
        <Textarea id="message" name="message" required minLength={10} className="min-h-32" />
      </div>
      <label className="grid gap-1.5 text-sm">
        {labels.preference}
        <select name="contactPreference" className="h-11 rounded-lg border border-input bg-card px-3" defaultValue="email">
          {["telegram", "email", "phone"].map((item) => (
            <option key={item} value={item}>{labels.options[item]}</option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-3 text-sm leading-6">
        <input type="checkbox" name="consent" className="mt-1" required />
        {labels.consent}
      </label>
      <input className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(event) => setWebsite(event.target.value)} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="accent" className="h-11" disabled={pending || !key}>{labels.submit}</Button>
    </form>
  );
}
