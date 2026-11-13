import { cookies } from "next/headers";
import { z } from "zod";
import { RECOVERY_COOKIE, recoveryCookieOptions } from "@/lib/recovery-screen";
import { publicGate } from "@/server/actions/guards";
import {
  confirmMfa,
  createFirstAdmin,
  getSession,
  loginWithPassword,
  logoutCurrent,
  setupOpen,
  verifyMfa,
} from "@/server/auth";
import { allowRate, hashValue } from "@/server/rate-limit";

export const instant = false;

const credentials = z.object({
  email: z.email().max(180),
  password: z.string().min(1).max(200),
});

function failureCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (/^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return "sunucu";
}

function redirectTo(request: Request, path: string) {
  const headerStore = request.headers;
  const forwarded = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const host = forwarded?.split(",")[0]?.trim() || new URL(request.url).host;
  const proto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return Response.redirect(`${proto}://${host}${path}`, 303);
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirectTo(request, "/admin/kurulum?hata=form");
  }
  const task = String(form.get("islem") ?? "");
  try {
    if (task === "kurulum") return await setup(request, form);
    if (task === "giris") return await login(request, form);
    if (task === "mfa") return await mfa(request, form);
    if (task === "cikis") {
      await logoutCurrent();
      return redirectTo(request, "/admin/giris");
    }
    return redirectTo(request, "/admin/giris");
  } catch (error) {
    console.error("admin_oturum_failed", failureCode(error));
    const back = task === "giris" ? "/admin/giris" : task === "mfa" ? "/admin/mfa" : "/admin/kurulum";
    return redirectTo(request, `${back}?hata=${failureCode(error)}`);
  }
}

async function setup(request: Request, form: FormData) {
  const gate = await publicGate("setup", 10, 60 * 60);
  if (!gate.ok) return redirectTo(request, gate.code === "origin" ? "/admin/kurulum?hata=origin" : "/admin/kurulum?hata=rate");
  if (!setupOpen(String(form.get("token") ?? ""))) return redirectTo(request, "/admin/kurulum?hata=anahtar");
  const parsed = z
    .object({
      email: z.email().max(180),
      displayName: z.string().trim().min(2).max(80),
      password: z.string().min(12).max(200),
    })
    .safeParse({
      email: form.get("email"),
      displayName: form.get("displayName"),
      password: form.get("password"),
    });
  if (!parsed.success) return redirectTo(request, "/admin/kurulum?hata=form");
  const result = await createFirstAdmin({
    ...parsed.data,
    userAgent: gate.userAgent,
    ip: gate.ip,
  });
  if (!result.ok) return redirectTo(request, `/admin/kurulum?hata=${result.code}`);
  return redirectTo(request, "/admin/mfa");
}

async function login(request: Request, form: FormData) {
  const gate = await publicGate("login", 30, 15 * 60);
  if (!gate.ok) return redirectTo(request, "/admin/giris?hata=rate");
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return redirectTo(request, "/admin/giris?hata=giris");
  const bucket = `login:${hashValue(gate.ip)}:${hashValue(parsed.data.email.toLowerCase())}`;
  if (!(await allowRate(bucket, 8, 15 * 60))) return redirectTo(request, "/admin/giris?hata=rate");
  const result = await loginWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    userAgent: gate.userAgent,
    ip: gate.ip,
  });
  if (!result.ok) return redirectTo(request, "/admin/giris?hata=giris");
  return redirectTo(request, "/admin/mfa");
}

async function mfa(request: Request, form: FormData) {
  const gate = await publicGate("mfa", 20, 15 * 60);
  if (!gate.ok) return redirectTo(request, "/admin/mfa?hata=rate");
  const session = await getSession();
  if (!session || session.role !== "admin") return redirectTo(request, "/admin/giris");
  if (session.mfaEnabled && session.mfaPassed) return redirectTo(request, "/admin");
  const code = String(form.get("code") ?? "");
  if (session.mfaEnabled) {
    const ok = await verifyMfa(session.profileId, session.sessionId, code);
    if (!ok) return redirectTo(request, "/admin/mfa?hata=kod");
    return redirectTo(request, "/admin");
  }
  const codes = await confirmMfa(session.profileId, session.sessionId, code);
  if (!codes) return redirectTo(request, "/admin/mfa?hata=kod");
  const jar = await cookies();
  jar.set(RECOVERY_COOKIE, codes.join(","), recoveryCookieOptions(process.env.NODE_ENV === "production"));
  return redirectTo(request, "/admin/mfa?hazir=1");
}
