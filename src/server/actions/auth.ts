"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicGate } from "@/server/actions/guards";
import {
  confirmMfa,
  createFirstAdmin,
  loginWithPassword,
  logoutCurrent,
  requireMfaStage,
  setupOpen,
  verifyMfa,
} from "@/server/auth";
import { allowRate, hashValue } from "@/server/rate-limit";

const credentials = z.object({
  email: z.email().max(180),
  password: z.string().min(1).max(200),
});

export async function loginAction(formData: FormData) {
  const gate = await publicGate("login", 30, 15 * 60);
  if (!gate.ok) redirect("/admin/giris?hata=rate");
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/admin/giris?hata=giris");
  const bucket = `login:${hashValue(gate.ip)}:${hashValue(parsed.data.email.toLowerCase())}`;
  if (!(await allowRate(bucket, 8, 15 * 60))) redirect("/admin/giris?hata=rate");
  const result = await loginWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    userAgent: gate.userAgent,
    ip: gate.ip,
  });
  if (!result.ok) redirect("/admin/giris?hata=giris");
  redirect("/admin/mfa");
}

export async function setupAction(formData: FormData) {
  const gate = await publicGate("setup", 10, 60 * 60);
  if (!gate.ok) redirect("/admin/kurulum?hata=rate");
  const token = String(formData.get("token") ?? "");
  if (!setupOpen(token)) redirect("/admin/kurulum?hata=anahtar");
  const parsed = z
    .object({
      email: z.email().max(180),
      displayName: z.string().trim().min(2).max(80),
      password: z.string().min(12).max(200),
    })
    .safeParse({
      email: formData.get("email"),
      displayName: formData.get("displayName"),
      password: formData.get("password"),
    });
  if (!parsed.success) redirect("/admin/kurulum?hata=form");
  const result = await createFirstAdmin({
    ...parsed.data,
    userAgent: gate.userAgent,
    ip: gate.ip,
  });
  if (!result.ok) redirect(`/admin/kurulum?hata=${result.code}`);
  redirect("/admin/mfa");
}

export async function logoutAction() {
  await logoutCurrent();
  redirect("/admin/giris");
}

export async function confirmMfaAction(formData: FormData) {
  const gate = await publicGate("mfa", 20, 15 * 60);
  if (!gate.ok) return { ok: false as const, code: "rate" as const };
  const session = await requireMfaStage();
  const code = String(formData.get("code") ?? "");
  if (session.mfaEnabled) {
    const ok = await verifyMfa(session.profileId, session.sessionId, code);
    if (!ok) return { ok: false as const, code: "kod" as const };
    redirect("/admin");
  }
  const codes = await confirmMfa(session.profileId, session.sessionId, code);
  if (!codes) return { ok: false as const, code: "kod" as const };
  return { ok: true as const, codes };
}
