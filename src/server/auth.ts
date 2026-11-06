import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { sql } from "@/server/db";
import { decryptText, encryptText } from "@/server/crypto";
import { hashPassword, passwordIsStrong, verifyPassword } from "@/lib/security/password";
import { generateTotpSecret, otpauthUri, verifyTotp } from "@/lib/security/totp";
import { hashValue } from "@/server/rate-limit";
import { audit } from "@/server/audit";

const COOKIE = "rota_session";
const SESSION_HOURS = 12;
const DUMMY_PASSWORD_HASH = hashPassword("not-a-real-password");

export type SessionUser = {
  sessionId: string;
  profileId: string;
  email: string;
  displayName: string;
  role: string;
  mfaEnabled: boolean;
  mfaPassed: boolean;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  password_hash: string;
  mfa_enabled: boolean;
  mfa_secret_enc: string | null;
  disabled_at: string | null;
};

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function setupOpen(token: string): boolean {
  const required = process.env.ADMIN_SETUP_TOKEN?.trim() ?? "";
  if (process.env.NODE_ENV !== "production") {
    if (!required) return true;
    return safeEqual(token, required);
  }
  if (!required) return false;
  return token.length > 0 && safeEqual(token, required);
}

export async function adminCount(): Promise<number> {
  const rows = await sql<{ n: number }>(
    "select count(*)::int as n from profiles where role = 'admin' and disabled_at is null",
  );
  return Number(rows[0]?.n ?? 0);
}

async function writeSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function persistSession(profileId: string, mfaPassed: boolean, userAgent: string | null, ip: string | null) {
  const token = randomBytes(32).toString("base64url");
  await sql(
    `insert into sessions (profile_id, token_hash, mfa_passed, expires_at, user_agent, ip_hash)
     values ($1, $2, $3, now() + interval '12 hours', $4, $5)`,
    [profileId, tokenHash(token), mfaPassed, userAgent?.slice(0, 180) ?? null, ip ? hashValue(ip) : null],
  );
  await writeSessionCookie(token);
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  await connection();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await sql<{
    session_id: string;
    profile_id: string;
    email: string;
    display_name: string;
    role: string;
    mfa_enabled: boolean;
    mfa_passed: boolean;
  }>(
    `select s.id as session_id, p.id as profile_id, p.email, p.display_name, p.role,
            p.mfa_enabled, s.mfa_passed
     from sessions s
     join profiles p on p.id = s.profile_id
     where s.token_hash = $1 and s.expires_at > now() and p.disabled_at is null
     limit 1`,
    [tokenHash(token)],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    sessionId: row.session_id,
    profileId: row.profile_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    mfaEnabled: row.mfa_enabled,
    mfaPassed: row.mfa_passed,
  };
});

export async function requirePanel(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/admin/giris");
  if (session.role !== "admin" || !session.mfaEnabled || !session.mfaPassed) redirect("/admin/mfa");
  return session;
}

export async function requireMfaStage(): Promise<SessionUser> {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/admin/giris");
  if (session.mfaEnabled && session.mfaPassed) redirect("/admin");
  return session;
}

async function findByEmail(email: string): Promise<ProfileRow | null> {
  const rows = await sql<ProfileRow>(
    `select id, email, display_name, role, password_hash, mfa_enabled, mfa_secret_enc, disabled_at
     from profiles where lower(email) = lower($1) limit 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
  userAgent: string | null;
  ip: string | null;
}): Promise<{ ok: true } | { ok: false }> {
  const profile = await findByEmail(input.email);
  const valid = verifyPassword(input.password, profile?.password_hash ?? DUMMY_PASSWORD_HASH);
  if (!profile || !valid || profile.disabled_at || profile.role !== "admin") {
    await audit({ action: "auth.login_failed", metadata: { reason: "invalid_credentials" } });
    return { ok: false };
  }
  await persistSession(profile.id, false, input.userAgent, input.ip);
  await audit({ actorId: profile.id, action: "auth.login_password", entityType: "profile", entityId: profile.id });
  return { ok: true };
}

export async function createFirstAdmin(input: {
  email: string;
  displayName: string;
  password: string;
  userAgent: string | null;
  ip: string | null;
}): Promise<{ ok: true } | { ok: false; code: "exists" | "weak" | "duplicate" }> {
  if ((await adminCount()) > 0) return { ok: false, code: "exists" };
  if (!passwordIsStrong(input.password)) return { ok: false, code: "weak" };
  try {
    const rows = await sql<{ id: string }>(
      `insert into profiles (email, display_name, role, password_hash)
       values ($1, $2, 'admin', $3)
       returning id`,
      [input.email.toLowerCase(), input.displayName, hashPassword(input.password)],
    );
    const id = rows[0]?.id;
    if (!id) return { ok: false, code: "duplicate" };
    await persistSession(id, false, input.userAgent, input.ip);
    await audit({ actorId: id, action: "auth.setup_admin", entityType: "profile", entityId: id });
    return { ok: true };
  } catch {
    return { ok: false, code: "duplicate" };
  }
}

export async function logoutCurrent() {
  const session = await getSession();
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) await sql("delete from sessions where token_hash = $1", [tokenHash(token)]);
  await clearSessionCookie();
  if (session) await audit({ actorId: session.profileId, action: "auth.logout", entityType: "profile", entityId: session.profileId });
}

export async function enrollmentPayload(profileId: string, email: string) {
  const rows = await sql<{ mfa_secret_enc: string | null; mfa_enabled: boolean }>(
    "select mfa_secret_enc, mfa_enabled from profiles where id = $1",
    [profileId],
  );
  const row = rows[0];
  if (!row || row.mfa_enabled) return null;
  let secret = row.mfa_secret_enc ? await decryptText(row.mfa_secret_enc) : "";
  if (!secret) {
    secret = generateTotpSecret();
    await sql("update profiles set mfa_secret_enc = $1, updated_at = now() where id = $2", [
      await encryptText(secret),
      profileId,
    ]);
  }
  const uri = otpauthUri(email, secret);
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 196, errorCorrectionLevel: "M" });
  return { secret, qrDataUrl };
}

function recoveryCode(): string {
  return randomBytes(5).toString("hex").slice(0, 8).toUpperCase();
}

export async function confirmMfa(profileId: string, sessionId: string, code: string) {
  const rows = await sql<{ mfa_secret_enc: string | null; mfa_enabled: boolean }>(
    "select mfa_secret_enc, mfa_enabled from profiles where id = $1",
    [profileId],
  );
  const secretEnc = rows[0]?.mfa_secret_enc;
  if (!secretEnc || rows[0]?.mfa_enabled) return null;
  const secret = await decryptText(secretEnc);
  if (!verifyTotp(secret, code)) return null;
  const codes = Array.from({ length: 8 }, () => recoveryCode());
  await sql("delete from recovery_codes where profile_id = $1", [profileId]);
  for (const recovery of codes) {
    await sql("insert into recovery_codes (profile_id, code_hash) values ($1, $2)", [profileId, hashValue(recovery)]);
  }
  await sql("update profiles set mfa_enabled = true, updated_at = now() where id = $1", [profileId]);
  await sql("update sessions set mfa_passed = true, last_seen_at = now() where id = $1", [sessionId]);
  await audit({ actorId: profileId, action: "auth.mfa_enabled", entityType: "profile", entityId: profileId });
  return codes;
}

export async function verifyMfa(profileId: string, sessionId: string, code: string) {
  const rows = await sql<{ mfa_secret_enc: string | null; mfa_enabled: boolean }>(
    "select mfa_secret_enc, mfa_enabled from profiles where id = $1",
    [profileId],
  );
  if (!rows[0]?.mfa_enabled || !rows[0].mfa_secret_enc) return false;
  const secret = await decryptText(rows[0].mfa_secret_enc);
  if (verifyTotp(secret, code)) {
    await sql("update sessions set mfa_passed = true, last_seen_at = now() where id = $1", [sessionId]);
    await audit({ actorId: profileId, action: "auth.mfa_passed", entityType: "profile", entityId: profileId });
    return true;
  }
  const hashed = hashValue(code.replace(/\s/g, "").toUpperCase());
  const codes = await sql<{ id: string; code_hash: string }>(
    "select id, code_hash from recovery_codes where profile_id = $1 and used_at is null",
    [profileId],
  );
  const match = codes.find((item) => safeEqual(item.code_hash, hashed));
  if (!match) {
    await audit({ actorId: profileId, action: "auth.mfa_failed", entityType: "profile", entityId: profileId });
    return false;
  }
  await sql("update recovery_codes set used_at = now() where id = $1", [match.id]);
  await sql("update sessions set mfa_passed = true, last_seen_at = now() where id = $1", [sessionId]);
  await audit({ actorId: profileId, action: "auth.recovery_used", entityType: "profile", entityId: profileId });
  return true;
}

export async function changePassword(profileId: string, currentPassword: string, nextPassword: string) {
  if (!passwordIsStrong(nextPassword)) return "weak" as const;
  const rows = await sql<{ password_hash: string }>("select password_hash from profiles where id = $1", [profileId]);
  if (!rows[0] || !verifyPassword(currentPassword, rows[0].password_hash)) return "invalid" as const;
  await sql("update profiles set password_hash = $1, updated_at = now() where id = $2", [
    hashPassword(nextPassword),
    profileId,
  ]);
  await audit({ actorId: profileId, action: "auth.password_changed", entityType: "profile", entityId: profileId });
  return "ok" as const;
}

export async function rotateRecoveryCodes(profileId: string, currentPassword: string) {
  const rows = await sql<{ password_hash: string }>("select password_hash from profiles where id = $1", [profileId]);
  if (!rows[0] || !verifyPassword(currentPassword, rows[0].password_hash)) return null;
  const codes = Array.from({ length: 8 }, () => recoveryCode());
  await sql("delete from recovery_codes where profile_id = $1", [profileId]);
  for (const recovery of codes) {
    await sql("insert into recovery_codes (profile_id, code_hash) values ($1, $2)", [profileId, hashValue(recovery)]);
  }
  await audit({ actorId: profileId, action: "auth.recovery_rotated", entityType: "profile", entityId: profileId });
  return codes;
}
