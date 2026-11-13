"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createContactAttempt } from "@/lib/contact-attempt";
import { contactResultView, type ContactEmailStatus } from "@/lib/contact-mail";
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
    subject: string;
    message: string;
    privacy: string;
    privacyLink: string;
    submit: string;
    done: string;
    sent: string;
    savedUnsent: string;
    savedPending: string;
    duplicate: string;
    errors: Record<string, string>;
  };
}) {
  const attempt = useRef(createContactAttempt());
  const sending = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [done, setDone] = useState<{ duplicate: boolean; recordCreated: boolean; emailStatus: ContactEmailStatus } | null>(null);

  if (done) {
    const view = contactResultView(done);
    const primary = view === "unsent"
      ? labels.savedUnsent
      : view === "pending"
        ? labels.savedPending
        : labels.done;
    const detail = view === "sent"
      ? labels.sent
      : view === "duplicate"
        ? labels.duplicate
        : "";
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="font-medium">{primary}</p>
        {detail ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p> : null}
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-2xl border border-border bg-card p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (sending.current) return;
        const idempotencyKey = attempt.current.prepare();
        sending.current = true;
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        try {
          const result = await submitContact({
            fullName: form.get("fullName"),
            email: form.get("email"),
            subject: form.get("subject"),
            message: form.get("message"),
            consent: form.get("consent") === "on" ? true : false,
            idempotencyKey,
            companyWebsite: website,
          });
          if (!result.ok) {
            setError(labels.errors[result.code] ?? labels.errors.unavailable);
            return;
          }
          setDone({
            duplicate: result.duplicate,
            recordCreated: "recordCreated" in result ? result.recordCreated : false,
            emailStatus: "emailStatus" in result && result.emailStatus ? result.emailStatus : "none",
          });
        } catch {
          setError(labels.errors.unavailable ?? "");
        } finally {
          sending.current = false;
          setPending(false);
        }
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="fullName">{labels.fullName}</Label>
        <Input id="fullName" name="fullName" className="h-11" required minLength={3} autoComplete="name" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">{labels.email}</Label>
        <Input id="email" name="email" type="email" className="h-11" required autoComplete="email" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="subject">{labels.subject}</Label>
        <Input id="subject" name="subject" className="h-11" required minLength={3} maxLength={160} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="message">{labels.message}</Label>
        <Textarea id="message" name="message" required minLength={10} className="min-h-32" />
      </div>
      <label className="flex items-start gap-3 text-sm leading-6">
        <input type="checkbox" name="consent" className="mt-1" required />
        <span>
          {labels.privacy}{" "}
          <Link href="/datenschutz" className="text-accent">{labels.privacyLink}</Link>
        </span>
      </label>
      <input className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(event) => setWebsite(event.target.value)} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="accent" className="h-11" disabled={pending}>{labels.submit}</Button>
    </form>
  );
}
