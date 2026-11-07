import "server-only";

import { headers } from "next/headers";
import { sameOrigin } from "@/lib/security/origin";
import { allowRate, clientIp, hashValue } from "@/server/rate-limit";

function requestHosts(headerStore: Headers): string[] {
  return [headerStore.get("x-forwarded-host"), headerStore.get("host")]
    .flatMap((value) => (value ? value.split(",") : []))
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function publicGate(bucket: string, limit: number, windowSeconds: number) {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const site = headerStore.get("sec-fetch-site");
  const hosts = requestHosts(headerStore);
  const originOk = origin
    ? hosts.some((host) => sameOrigin(origin, host))
    : site === "same-origin" || site === "same-site" || site === "none" || site === null;
  if (!originOk) {
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
