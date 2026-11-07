import "server-only";

import { auditWith } from "@/server/audit";
import { sql, withTransaction, type QueryFn } from "@/server/db";
import { isApplicationCode } from "@/lib/public-code";
import { TRACKER_DEFAULT, TRACKER_LABEL, isTrackerStage, verifierMatches, type TrackerStage } from "@/lib/domain/tracker";

async function publicCopy(query: QueryFn, stage: TrackerStage): Promise<string> {
  const rows = await query<{ body: string }>("select body from tracker_copy where stage = $1", [stage]);
  const body = rows[0]?.body?.trim();
  return body || TRACKER_DEFAULT[stage];
}

export async function attachReceived(query: QueryFn, leadId: string, notice: { title: string; body: string; href: string }) {
  const message = await publicCopy(query, "received");
  await query(
    `insert into tracker_events (lead_id, from_stage, to_stage, public_message) values ($1, null, 'received', $2)`,
    [leadId, message],
  );
  await query(
    `insert into notifications (kind, title, body, href) values ('lead', $1, $2, $3)`,
    [notice.title, notice.body.slice(0, 240), notice.href],
  );
}

export async function openForReview(actorId: string, leadId: string): Promise<boolean> {
  return withTransaction(async (query) => {
    const rows = await query<{ id: string }>(
      `update leads set tracker_stage = 'reviewing', updated_at = now()
       where id = $1 and tracker_stage = 'received' and deleted_at is null
       returning id`,
      [leadId],
    );
    if (!rows[0]) return false;
    const message = await publicCopy(query, "reviewing");
    await query(
      `insert into tracker_events (lead_id, from_stage, to_stage, actor_id, public_message)
       values ($1, 'received', 'reviewing', $2, $3)`,
      [leadId, actorId, message],
    );
    await auditWith(query, {
      actorId,
      action: "lead.tracker_opened",
      entityType: "lead",
      entityId: leadId,
      metadata: { from: "received", to: "reviewing" },
    });
    return true;
  });
}

export async function setTrackerStage(actorId: string, leadId: string, stage: string, message: string): Promise<boolean> {
  if (!isTrackerStage(stage)) return false;
  return withTransaction(async (query) => {
    const current = await query<{ tracker_stage: string }>(
      "select tracker_stage from leads where id = $1 and deleted_at is null",
      [leadId],
    );
    if (!current[0]) return false;
    const from = current[0].tracker_stage;
    const text = message.trim().slice(0, 800) || (await publicCopy(query, stage));
    await query("update leads set tracker_stage = $2, updated_at = now() where id = $1", [leadId, stage]);
    await query(
      `insert into tracker_events (lead_id, from_stage, to_stage, actor_id, public_message)
       values ($1, $2, $3, $4, $5)`,
      [leadId, from, stage, actorId, text],
    );
    await auditWith(query, {
      actorId,
      action: "lead.tracker_changed",
      entityType: "lead",
      entityId: leadId,
      metadata: { from, to: stage },
    });
    return true;
  });
}

export async function saveTrackerCopy(actorId: string, stage: string, body: string): Promise<boolean> {
  if (!isTrackerStage(stage) || body.trim().length < 10) return false;
  await sql(
    `insert into tracker_copy (stage, body, updated_at) values ($1, $2, now())
     on conflict (stage) do update set body = excluded.body, updated_at = now()`,
    [stage, body.trim().slice(0, 800)],
  );
  const { audit } = await import("@/server/audit");
  await audit({ actorId, action: "tracker.copy_updated", entityType: "tracker_copy", metadata: { stage } });
  return true;
}

export async function listTrackerCopy() {
  return sql<{ stage: string; body: string }>("select stage, body from tracker_copy order by stage");
}

export type PublicTrack = {
  stage: TrackerStage;
  label: string;
  message: string;
  events: Array<{ label: string; message: string; at: string }>;
};

export async function lookupPublic(code: string, verifier: string): Promise<PublicTrack | null> {
  const normalized = code.trim().toUpperCase();
  if (!isApplicationCode(normalized)) return null;
  const leads = await sql<{ id: string; email: string | null; phone: string | null; telegram_handle: string | null; tracker_stage: string }>(
    `select id, email, phone, telegram_handle, tracker_stage from leads
     where public_code = $1 and deleted_at is null and merged_into is null`,
    [normalized],
  );
  const lead = leads[0];
  if (!lead || !isTrackerStage(lead.tracker_stage) || !verifierMatches({ email: lead.email, phone: lead.phone, telegram: lead.telegram_handle }, verifier)) return null;
  const events = await sql<{ to_stage: string; public_message: string; created_at: string }>(
    `select to_stage, public_message, created_at from tracker_events
     where lead_id = $1 order by created_at`,
    [lead.id],
  );
  const visible = events.filter((event) => isTrackerStage(event.to_stage));
  const current = visible.at(-1);
  return {
    stage: lead.tracker_stage,
    label: TRACKER_LABEL[lead.tracker_stage],
    message: current?.public_message || TRACKER_DEFAULT[lead.tracker_stage],
    events: visible.map((event) => ({
      label: TRACKER_LABEL[event.to_stage as TrackerStage],
      message: event.public_message,
      at: event.created_at,
    })),
  };
}

export async function linkTelegramTrack(input: {
  code: string;
  verifier: string;
  telegramUserId: string | null;
}): Promise<{ ok: true; label: string; message: string } | { ok: false }> {
  const normalized = input.code.trim().toUpperCase();
  if (!isApplicationCode(normalized)) return { ok: false };
  const leads = await sql<{ id: string; email: string | null; phone: string | null; tracker_stage: string; telegram_user_id: string | null }>(
    `select id, email, phone, tracker_stage, telegram_user_id from leads
     where public_code = $1 and deleted_at is null and merged_into is null`,
    [normalized],
  );
  const lead = leads[0];
  if (!lead || !isTrackerStage(lead.tracker_stage) || !verifierMatches(lead, input.verifier)) return { ok: false };
  if (input.telegramUserId && lead.telegram_user_id && lead.telegram_user_id !== input.telegramUserId) return { ok: false };
  if (input.telegramUserId && !lead.telegram_user_id) {
    await sql("update leads set telegram_user_id = $2, updated_at = now() where id = $1", [lead.id, input.telegramUserId]);
  }
  const message = await sql<{ public_message: string }>(
    `select public_message from tracker_events where lead_id = $1 order by created_at desc limit 1`,
    [lead.id],
  );
  return {
    ok: true,
    label: TRACKER_LABEL[lead.tracker_stage],
    message: message[0]?.public_message || TRACKER_DEFAULT[lead.tracker_stage],
  };
}
