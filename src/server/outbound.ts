import "server-only";

import { nextAttemptDelayMs, noticeFromJob, type NoticeState } from "@/lib/outbound-policy";
import { sql } from "@/server/db";
import { sendApplicationCode, sendStaffNotice, type StaffNoticeResult } from "@/server/mail";

type JobKind = "email" | "telegram";
type JobRow = { id: string; kind: string; payload: Record<string, string> | string; attempts: number };

export async function enqueueOutbound(kind: JobKind, payload: Record<string, string>): Promise<string> {
  const rows = await sql<{ id: string }>(
    `insert into outbound_jobs (kind, payload) values ($1, $2::jsonb) returning id`,
    [kind, JSON.stringify(payload)],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("outbound_insert_failed");
  return id;
}

function payloadOf(value: JobRow["payload"]): Record<string, string> {
  return typeof value === "string" ? JSON.parse(value) as Record<string, string> : value;
}

async function reschedule(id: string, attempts: number, lastError: string) {
  await sql(
    `update outbound_jobs
     set attempts = $2,
         last_error = $3,
         status = case when $2 >= 5 then 'failed' else 'pending' end,
         next_attempt_at = now() + make_interval(secs => $4::int)
     where id = $1`,
    [id, attempts, lastError.slice(0, 180), Math.round(nextAttemptDelayMs(attempts) / 1000)],
  );
}

async function deliver(kind: string, payload: Record<string, string>): Promise<"sent" | "skipped" | "failed" | "no-email"> {
  if (kind === "telegram") return "skipped";
  if (kind === "email") return sendApplicationCode(payload.to ?? null, payload.code ?? "");
  return "failed";
}

type StaffReport = { emailStatus: NoticeState; attempted: boolean; errorCode: string };

async function finishStaff(job: JobRow, payload: Record<string, string>): Promise<StaffReport> {
  let report: StaffNoticeResult;
  try {
    report = await sendStaffNotice({ to: payload.to ?? null, subject: payload.subject ?? "ROTA DE", text: payload.text ?? "" });
  } catch (error) {
    console.error("mail_failed", error instanceof Error ? error.name : "error");
    report = { attempted: true, status: "failed", errorCode: "resend_network" };
  }
  if (report.status === "sent") {
    await sql("update outbound_jobs set status = 'sent', attempts = attempts + 1, last_error = null where id = $1", [job.id]);
    return { emailStatus: "sent", attempted: true, errorCode: "ok" };
  }
  await sql(
    "update outbound_jobs set status = 'failed', attempts = attempts + 1, last_error = $2 where id = $1",
    [job.id, report.errorCode],
  );
  return { emailStatus: "failed", attempted: report.attempted, errorCode: report.errorCode };
}

async function finish(job: JobRow) {
  const payload = payloadOf(job.payload);
  if (job.kind === "email" && payload.purpose === "staff") {
    await finishStaff(job, payload);
    return;
  }
  try {
    const result = await deliver(job.kind, payload);
    if (result === "sent") {
      await sql("update outbound_jobs set status = 'sent', attempts = attempts + 1, last_error = null where id = $1", [job.id]);
      return;
    }
    if (result === "skipped" || result === "no-email") {
      await sql(
        "update outbound_jobs set status = 'failed', attempts = attempts + 1, last_error = $2 where id = $1",
        [job.id, result === "no-email" ? "no_email" : "not_configured"],
      );
      return;
    }
    await reschedule(job.id, job.attempts + 1, "delivery_failed");
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 180) : "unknown";
    console.error("outbound_failed", { kind: job.kind, message });
    await reschedule(job.id, job.attempts + 1, message).catch(() => undefined);
  }
}

async function pendingJob(id: string) {
  return sql<JobRow>(
    `select id, kind, payload, attempts from outbound_jobs
     where id = $1 and status = 'pending' and attempts < 5`,
    [id],
  );
}

export async function settleOutbound(id: string): Promise<NoticeState> {
  const jobs = await pendingJob(id);
  if (jobs[0]) await finish(jobs[0]);
  const rows = await sql<{ status: string }>("select status from outbound_jobs where id = $1", [id]);
  return noticeFromJob(rows[0]?.status);
}

export async function settleStaffOutbound(id: string): Promise<StaffReport> {
  const jobs = await pendingJob(id);
  if (jobs[0]) {
    const payload = payloadOf(jobs[0].payload);
    if (jobs[0].kind === "email" && payload.purpose === "staff") return finishStaff(jobs[0], payload);
    await finish(jobs[0]);
  }
  const rows = await sql<{ status: string; last_error: string | null }>(
    "select status, last_error from outbound_jobs where id = $1",
    [id],
  );
  const emailStatus = noticeFromJob(rows[0]?.status);
  const errorCode = rows[0]?.last_error ?? (emailStatus === "sent" ? "ok" : "none");
  return { emailStatus, attempted: errorCode === "ok" || errorCode.startsWith("resend_"), errorCode };
}

export async function drainOutbound(limit = 8): Promise<void> {
  const jobs = await sql<JobRow>(
    `select id, kind, payload, attempts from outbound_jobs
     where status = 'pending' and next_attempt_at <= now() and attempts < 5
     order by created_at asc
     limit $1`,
    [limit],
  );
  for (const job of jobs) await finish(job);
}
