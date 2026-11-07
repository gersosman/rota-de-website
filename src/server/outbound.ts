import "server-only";

import { nextAttemptDelayMs } from "@/lib/outbound-policy";
import { sql } from "@/server/db";
import { sendApplicationCode } from "@/server/mail";
import { notifyAdmin } from "@/server/telegram/notify";

type JobKind = "email" | "telegram";

export async function enqueueOutbound(kind: JobKind, payload: Record<string, string>) {
  await sql(
    `insert into outbound_jobs (kind, payload) values ($1, $2::jsonb)`,
    [kind, JSON.stringify(payload)],
  );
}

async function deliver(kind: string, payload: Record<string, string>): Promise<"sent" | "skipped" | "failed" | "no-email"> {
  if (kind === "email") return sendApplicationCode(payload.to ?? null, payload.code ?? "");
  if (kind === "telegram") return notifyAdmin(payload.text ?? "");
  return "failed";
}

export async function drainOutbound(limit = 8): Promise<void> {
  const jobs = await sql<{ id: string; kind: string; payload: Record<string, string> | string; attempts: number }>(
    `select id, kind, payload, attempts from outbound_jobs
     where status = 'pending' and next_attempt_at <= now() and attempts < 5
     order by created_at asc
     limit $1`,
    [limit],
  );
  for (const job of jobs) {
    const payload = typeof job.payload === "string" ? JSON.parse(job.payload) as Record<string, string> : job.payload;
    try {
      const result = await deliver(job.kind, payload);
      if (result === "sent") {
        await sql("update outbound_jobs set status = 'sent', attempts = attempts + 1, last_error = null where id = $1", [job.id]);
        continue;
      }
      if (result === "skipped" || result === "no-email") {
        await sql(
          "update outbound_jobs set status = 'failed', attempts = attempts + 1, last_error = $2 where id = $1",
          [job.id, result === "no-email" ? "no_email" : "not_configured"],
        );
        continue;
      }
      const attempts = job.attempts + 1;
      await sql(
        `update outbound_jobs
         set attempts = $2,
             last_error = 'delivery_failed',
             status = case when $2 >= 5 then 'failed' else 'pending' end,
             next_attempt_at = now() + make_interval(secs => $3::int)
         where id = $1`,
        [job.id, attempts, Math.round(nextAttemptDelayMs(attempts) / 1000)],
      );
    } catch (error) {
      console.error("outbound_failed", {
        kind: job.kind,
        message: error instanceof Error ? error.message.slice(0, 180) : "unknown",
      });
    }
  }
}
