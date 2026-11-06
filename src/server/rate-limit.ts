import "server-only";

import { createHash } from "node:crypto";
import { sql } from "@/server/db";
import { num } from "@/lib/format";

export function clientIp(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headerStore.get("x-real-ip") ?? "unknown";
}

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export async function allowRate(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await sql<{ hits: number }>(
    `insert into rate_limits (bucket, hits, window_start)
     values ($1, 1, now())
     on conflict (bucket) do update set
       hits = case
         when rate_limits.window_start < now() - make_interval(secs => $2::int) then 1
         else rate_limits.hits + 1
       end,
       window_start = case
         when rate_limits.window_start < now() - make_interval(secs => $2::int) then now()
         else rate_limits.window_start
       end
     returning hits`,
    [bucket, windowSeconds],
  );
  return num(rows[0]?.hits) <= limit;
}
