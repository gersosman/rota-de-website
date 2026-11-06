"use client";

import { useState } from "react";
import { submitDeletion } from "@/server/actions/intake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeletionForm({
  title,
  body,
  submit,
  done,
  consent,
}: {
  title: string;
  body: string;
  submit: string;
  done: string;
  consent: string;
}) {
  const [state, setState] = useState<"form" | "done" | "error">("form");
  return (
    <section className="mt-10 rounded-2xl border border-border p-5">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      {state === "done" ? <p className="mt-4 text-sm">{done}</p> : null}
      {state !== "done" ? (
        <form
          className="mt-4 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const result = await submitDeletion({
              email: form.get("email"),
              consent: form.get("consent") === "on" ? true : false,
            });
            setState(result.ok ? "done" : "error");
          }}
        >
          <Input name="email" type="email" required className="h-11" />
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" required className="mt-1" />
            {consent}
          </label>
          {state === "error" ? <p className="text-sm text-destructive">Talep kaydedilemedi.</p> : null}
          <Button type="submit" variant="outline" className="h-11">{submit}</Button>
        </form>
      ) : null}
    </section>
  );
}
