import "server-only";

import { headers } from "next/headers";
import { sameOrigin } from "@/lib/security/origin";
import { allowRate, clientIp, hashValue } from "@/server/rate-limit";

export async function publicGate(bucket: string, limit: number, windowSeconds: number) {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!sameOrigin(headerStore.get("origin"), host)) {
    return { ok: false as const, code: "origin" as const };
  }
  const allowed = await allowRate(`${bucket}:${hashValue(clientIp(headerStore))}`, limit, windowSeconds);
  if (!allowed) return { ok: false as const, code: "rate" as const };
  return {
    ok: true as const,
    ip: clientIp(headerStore),
    userAgent: headerStore.get("user-agent"),
  };
}
