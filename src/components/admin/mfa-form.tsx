"use client";

import { useState } from "react";
import Link from "next/link";
import { confirmMfaAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MfaForm({
  mode,
  secret,
  qrDataUrl,
}: {
  mode: "enroll" | "verify";
  secret?: string;
  qrDataUrl?: string;
}) {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (codes) {
    return (
      <div className="grid gap-4">
        <h2 className="font-serif text-3xl">Kurtarma kodları</h2>
        <p className="text-sm leading-6 text-muted-foreground">Bu kodlar bir kez gösterilir. Güvenli bir yere yazın. Her kod tek kullanımlıktır.</p>
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
          {codes.map((code) => (
            <li key={code} className="rounded-lg border border-border px-3 py-2">{code}</li>
          ))}
        </ul>
        <Button nativeButton={false} className="h-11" render={<Link href="/admin" />}>Panele geç</Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      action={async (formData) => {
        const result = await confirmMfaAction(formData);
        if (result && "codes" in result && result.codes) {
          setCodes(result.codes);
          return;
        }
        if (result && !result.ok) setError(result.code === "rate" ? "Çok fazla deneme." : "Kod doğrulanamadı.");
      }}
    >
      {mode === "enroll" && qrDataUrl ? (
        <div>
          <p className="text-sm leading-6 text-muted-foreground">Kimlik doğrulayıcı uygulamada bu kodu ekleyin, sonra 6 haneli kodu girin. MFA tamamlanmadan panele geçilmez.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Kimlik doğrulayıcı QR kodu" className="mt-4 size-48 rounded-xl bg-white p-2" />
          <p className="mt-3 font-mono text-xs break-all">{secret}</p>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">Kimlik doğrulayıcıdaki 6 haneli kodu veya kullanılmamış bir kurtarma kodunu girin.</p>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="code">Kod</Label>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required className="h-11" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="h-11">{mode === "enroll" ? "MFA'yı aç" : "Doğrula"}</Button>
    </form>
  );
}
