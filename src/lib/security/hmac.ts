import { createHmac, timingSafeEqual } from "node:crypto";

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
