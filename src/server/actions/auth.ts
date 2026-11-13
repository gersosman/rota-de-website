"use server";

import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { publicGate } from "@/server/actions/guards";
import { mayClearRecoveryCookie, RECOVERY_COOKIE, RECOVERY_COOKIE_PATH } from "@/lib/recovery-screen";
import {
  confirmMfa,
  createFirstAdmin,
  getSession,
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

function failureCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (/^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return "sunucu";
}

export async function setupAction(formData: FormData) {
  try {
    await runSetup(formData);
  } catch (error) {
    unstable_rethrow(error);
    console.error("setup_failed", failureCode(error));
    redirect(`/admin/kurulum?hata=${failureCode(error)}`);
  }
}

async function runSetup(formData: FormData) {
  const gate = await publicGate("setup", 10, 60 * 60);
  if (!gate.ok) redirect(gate.code === "origin" ? "/admin/kurulum?hata=origin" : "/admin/kurulum?hata=rate");
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

export async function acknowledgeRecoveryAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/admin/giris");
  const confirmed = String(formData.get("saved") ?? "") === "on";
  if (!mayClearRecoveryCookie({ confirmed, mfaEnabled: session.mfaEnabled, mfaPassed: session.mfaPassed })) {
    redirect("/admin/mfa");
  }
  const jar = await cookies();
  jar.delete({
    name: RECOVERY_COOKIE,
    path: RECOVERY_COOKIE_PATH,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  redirect("/admin");
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
