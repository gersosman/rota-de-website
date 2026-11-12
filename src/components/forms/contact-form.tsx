"use client";

import { useId, useState } from "react";
import { submitContact } from "@/server/actions/intake";
import { ChannelPicker, type ContactChannel } from "@/components/forms/channel-picker";
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
    phone: string;
    telegram: string;
    channelHint: string;
    channelNeed: string;
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
  const [channels, setChannels] = useState<ContactChannel[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");

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
        if (!channels[0]) {
          setError(labels.channelNeed);
          return;
        }
        setPending(true);
        const result = await submitContact({
          fullName: form.get("fullName"),
          email: channels.includes("email") ? email : "",
          message: form.get("message"),
          contactPreference: channels[0],
          channels,
          phone: channels.includes("phone") ? phone : "",
          telegramHandle: channels.includes("telegram") ? telegram : "",
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
        <Label htmlFor="message">{labels.message}</Label>
        <Textarea id="message" name="message" required minLength={10} className="min-h-32" />
      </div>
      <ChannelPicker
        value={channels}
        onChange={setChannels}
        title={labels.preference}
        hint={labels.channelHint}
        required={labels.channelNeed}
        labels={{ phone: labels.phone, email: labels.options.email ?? "E-posta", telegram: labels.options.telegram ?? "Telegram" }}
      />
      {channels.includes("phone") ? (
        <div className="grid gap-1.5">
          <Label htmlFor="phone">{labels.phone}</Label>
          <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={8} className="h-11" inputMode="tel" autoComplete="tel" />
        </div>
      ) : null}
      {channels.includes("email") ? (
        <div className="grid gap-1.5">
          <Label htmlFor="email">{labels.email}</Label>
          <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="h-11" required autoComplete="email" />
        </div>
      ) : null}
      {channels.includes("telegram") ? (
        <div className="grid gap-1.5">
          <Label htmlFor="telegram">{labels.telegram}</Label>
          <Input id="telegram" value={telegram} onChange={(event) => setTelegram(event.target.value)} required minLength={5} className="h-11" autoComplete="off" />
        </div>
      ) : null}
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
