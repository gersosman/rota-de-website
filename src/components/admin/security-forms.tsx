"use client";

import { useState } from "react";
import { changePasswordAction, rotateRecoveryAction } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SecurityForms() {
  const [message, setMessage] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  return (
    <div className="grid gap-4">
      <form
        className="grid gap-2 rounded-2xl border border-border bg-card p-4"
        action={async (formData) => {
          const result = await changePasswordAction(formData);
          setMessage(result.ok ? "Parola güncellendi." : result.code === "weak" ? "Yeni parola zayıf." : "Mevcut parola hatalı.");
        }}
      >
        <h2 className="font-medium">Parola</h2>
        <Input name="currentPassword" type="password" required placeholder="Mevcut parola" className="h-10" />
        <Input name="nextPassword" type="password" required minLength={12} placeholder="Yeni parola" className="h-10" />
        <Button type="submit" variant="outline" className="h-10">Parolayı değiştir</Button>
      </form>
      <form
        className="grid gap-2 rounded-2xl border border-border bg-card p-4"
        action={async (formData) => {
          const result = await rotateRecoveryAction(formData);
          if (!result.ok) {
            setMessage("Kurtarma kodları yenilenemedi.");
            return;
          }
          setCodes(result.codes);
        }}
      >
        <h2 className="font-medium">Kurtarma kodları</h2>
        <Input name="currentPassword" type="password" required placeholder="Mevcut parola" className="h-10" />
        <Button type="submit" variant="outline" className="h-10">Kodları yenile</Button>
        {codes ? (
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((code) => <li key={code}>{code}</li>)}
          </ul>
        ) : null}
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
