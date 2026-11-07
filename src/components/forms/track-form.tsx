"use client";

import { useState } from "react";
import { lookupApplicationAction } from "@/server/actions/tracker";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Result = {
  label: string;
  message: string;
  events: Array<{ label: string; message: string; at: string }>;
};

export function TrackForm({
  copy,
}: {
  copy: {
    code: string;
    verifier: string;
    verifierHint: string;
    submit: string;
    checking: string;
    missing: string;
    error: string;
    rate: string;
    timeline: string;
  };
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  return (
    <div>
      <form
        className="grid gap-3 rounded-3xl border border-border bg-card p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setPending(true);
          setError(null);
          const response = await lookupApplicationAction({
            code: data.get("code"),
            verifier: data.get("verifier"),
            companyWebsite: website,
          });
          setPending(false);
          if (!response.ok) {
            setResult(null);
            setError(response.code === "rate" ? copy.rate : response.code === "unavailable" ? copy.error : copy.missing);
            return;
          }
          setResult(response.result);
        }}
      >
        <Input name="code" required placeholder={copy.code} className="h-12 font-mono uppercase" autoComplete="off" />
        <Input name="verifier" required placeholder={copy.verifier} className="h-12" autoComplete="off" />
        <p className="text-xs leading-5 text-muted-foreground">{copy.verifierHint}</p>
        <input className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant="accent" className="h-12" disabled={pending}>{pending ? copy.checking : copy.submit}</Button>
      </form>
      {result ? (
        <section className="mt-8">
          <p className="text-xs tracking-[0.16em] text-accent uppercase">{copy.timeline}</p>
          <h2 className="mt-2 font-serif text-3xl">{result.label}</h2>
          <p className="mt-3 text-sm leading-6">{result.message}</p>
          <ol className="mt-6 space-y-4 border-l border-border pl-4">
            {result.events.map((event) => (
              <li key={`${event.at}-${event.label}`}>
                <p className="text-sm font-medium">{event.label}</p>
                <p className="text-sm leading-6 text-muted-foreground">{event.message}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
