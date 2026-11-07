"use client";

import { useState } from "react";
import Link from "next/link";
import { requestHumanAction } from "@/server/actions/operations";

type Copy = {
  title: string;
  unavailable: string;
  reason: string;
  human: string;
  apply: string;
  faq: string;
  name: string;
  email: string;
  message: string;
  consent: string;
  send: string;
  sent: string;
  close: string;
  open: string;
};

export function Assistant({ copy }: { copy: Copy }) {
  const [open, setOpen] = useState(false);
  const [human, setHuman] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");

  return (
    <div className="fixed right-4 bottom-4 z-40">
      {open ? (
        <section className="mb-3 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-[#0c1c2e] p-4 text-[#f4f1ea] shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-xl">{copy.title}</p>
              <p className="mt-2 text-sm leading-6 text-white/75">{copy.unavailable}</p>
            </div>
            <button type="button" className="text-sm text-white/70" onClick={() => setOpen(false)}>{copy.close}</button>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/60">{copy.reason}</p>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <Link href="/on-degerlendirme" className="rounded-full bg-accent px-4 py-2 text-center text-accent-foreground">{copy.apply}</Link>
            <Link href="/sss" className="rounded-full border border-white/15 px-4 py-2 text-center">{copy.faq}</Link>
            <button type="button" className="rounded-full border border-white/15 px-4 py-2" onClick={() => setHuman(true)}>{copy.human}</button>
          </div>
          {human ? (
            <form
              className="mt-4 grid gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setPending(true);
                setError(null);
                const result = await requestHumanAction({
                  fullName: form.get("fullName"),
                  email: form.get("email"),
                  message: form.get("message"),
                  consent: form.get("consent") === "on",
                  companyWebsite: website,
                });
                setPending(false);
                if (!result.ok) {
                  setError(copy.reason);
                  return;
                }
                setDone(result.publicCode);
              }}
            >
              {done ? <p className="text-sm">{copy.sent} {done ?? ""}</p> : (
                <>
                  <input name="fullName" required minLength={3} placeholder={copy.name} className="h-11 rounded-xl bg-white/10 px-3 text-sm" />
                  <input name="email" type="email" placeholder={copy.email} className="h-11 rounded-xl bg-white/10 px-3 text-sm" />
                  <textarea name="message" required minLength={5} placeholder={copy.message} className="min-h-20 rounded-xl bg-white/10 px-3 py-2 text-sm" />
                  <label className="flex gap-2 text-xs leading-5"><input type="checkbox" name="consent" required />{copy.consent}</label>
                  <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                  {error ? <p className="text-xs text-accent">{error}</p> : null}
                  <button type="submit" disabled={pending} className="h-11 rounded-full bg-accent text-sm text-accent-foreground">{copy.send}</button>
                </>
              )}
            </form>
          ) : null}
        </section>
      ) : null}
      <button type="button" onClick={() => setOpen((value) => !value)} className="h-12 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground shadow-lg">
        {copy.open}
      </button>
    </div>
  );
}
