import { createHmac, timingSafeEqual } from "node:crypto";

export function secretEquals(expected: string, given: string | null): boolean {
  if (!expected || !given) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(given);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signHmacSha256(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyHmacSha256(secret: string, body: string, signature: string | null): boolean {
  if (!secret || !signature) return false;
  const expected = signHmacSha256(secret, body);
  const given = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
