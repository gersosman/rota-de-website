import "server-only";

import { audit, auditWith } from "@/server/audit";
import { sql, withTransaction, type QueryFn } from "@/server/db";
import { classifyAssessment } from "@/lib/domain/classify";
import type { LeadStatus, ScenarioHint } from "@/lib/domain/labels";
import { escapeLike, isUuid, jsonArray, num } from "@/lib/format";
import type { AssessmentInput, ContactInput } from "@/lib/validation/assessment";

const CONSENT_VERSION = "onay-2026-11";

export type LeadListItem = {
  id: string;
  publicCode: string;
  fullName: string;
  email: string | null;
  status: LeadStatus;
  scenarioHint: ScenarioHint | null;
  source: string;
  country: string | null;
  followUpOn: string | null;
  createdAt: string;
  lastContactAt: string | null;
};

type LeadRow = {
  id: string;
  public_code: string;
  full_name: string;
  email: string | null;
  contact_preference: string;
  phone: string | null;
  telegram_handle: string | null;
  instagram_handle: string | null;
  country: string | null;
  age_range: string | null;
  licence_classes: unknown;
  licence_country: string | null;
  experience_range: string | null;
  eu_eea_licence: string | null;
  code95_status: string | null;
  german_level: string | null;
  intent: string | null;
  source: string;
  status: LeadStatus;
  scenario_hint: ScenarioHint | null;
  notes: string | null;
  last_contact_at: string | null;
  follow_up_on: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapList(row: LeadRow): LeadListItem {
  return {
    id: row.id,
    publicCode: row.public_code,
    fullName: row.full_name,
    email: row.email,
    status: row.status,
    scenarioHint: row.scenario_hint,
    source: row.source,
    country: row.country,
    followUpOn: row.follow_up_on,
    createdAt: row.created_at,
    lastContactAt: row.last_contact_at,
  };
}

async function nextPublicCode(query: QueryFn): Promise<string> {
  const year = new Date().getUTCFullYear();
  const rows = await query<{ last_value: number }>(
    `insert into lead_counters (year, last_value) values ($1, 1)
     on conflict (year) do update set last_value = lead_counters.last_value + 1
     returning last_value`,
    [year],
  );
  const value = num(rows[0]?.last_value);
  return `RD-${year}-${String(value).padStart(5, "0")}`;
}

export async function findSubmission(idempotencyKey: string) {
  const rows = await sql<{ public_code: string }>(
    "select public_code from intake_submissions where idempotency_key = $1",
    [idempotencyKey],
  );
  return rows[0]?.public_code ?? null;
}

export async function createAssessmentLead(input: AssessmentInput) {
  const existing = await findSubmission(input.idempotencyKey);
  if (existing) return { publicCode: existing, duplicate: true as const };

  const classification = classifyAssessment({
    residenceCountry: input.residenceCountry,
    ageRange: input.ageRange,
    licenceClasses: input.licenceClasses,
    licenceCountry: input.licenceCountry,
    hasCe: input.hasCe,
    euEeaLicence: input.euEeaLicence,
    code95: input.code95,
    experienceRange: input.experienceRange,
    germanLevel: input.germanLevel,
    intent: input.intent,
  });

  const country =
    input.residenceCountry === "OTHER" ? (input.residenceDetail ?? "OTHER") : input.residenceCountry;
  const licenceCountry =
    input.licenceCountry === "OTHER" ? (input.licenceCountryDetail ?? "OTHER") : input.licenceCountry;

  return withTransaction(async (query) => {
    const version = await query<{ id: string }>(
      "select id from legislation_versions where is_active = true limit 1",
    );
    const publicCode = await nextPublicCode(query);
    const leads = await query<{ id: string }>(
      `insert into leads (
         public_code, full_name, email, contact_preference, phone, telegram_handle, instagram_handle,
         country, age_range, licence_classes, licence_country, experience_range, eu_eea_licence,
         code95_status, german_level, intent, source, status, scenario_hint
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,'website_assessment',$17,$18
       ) returning id`,
      [
        publicCode,
        input.fullName,
        input.email.toLowerCase(),
        input.contactPreference,
        input.phone ?? null,
        input.telegramHandle ?? null,
        input.instagramHandle ?? null,
        country,
        input.ageRange,
        JSON.stringify(input.licenceClasses),
        licenceCountry,
        input.experienceRange,
        input.euEeaLicence,
        input.code95,
        input.germanLevel,
        input.intent,
        classification.leadStatus,
        classification.hint,
      ],
    );
    const leadId = leads[0]?.id;
    if (!leadId) throw new Error("lead_insert_failed");
    await query(
      `insert into lead_status_events (lead_id, from_status, to_status, note)
       values ($1, null, $2, $3)`,
      [leadId, classification.leadStatus, "Ön değerlendirme kaydı. Hukuki karar değildir."],
    );
    await query(
      `insert into lead_assessments (
         lead_id, legislation_version_id, answers, classification, classification_reason, disclaimer_ack
       ) values ($1, $2, $3::jsonb, $4, $5, true)`,
      [
        leadId,
        version[0]?.id ?? null,
        JSON.stringify({
          residenceCountry: input.residenceCountry,
          residenceDetail: input.residenceDetail ?? null,
          ageRange: input.ageRange,
          licenceClasses: input.licenceClasses,
          licenceCountry: input.licenceCountry,
          licenceCountryDetail: input.licenceCountryDetail ?? null,
          hasCe: input.hasCe,
          euEeaLicence: input.euEeaLicence,
          code95: input.code95,
          experienceRange: input.experienceRange,
          germanLevel: input.germanLevel,
          intent: input.intent,
        }),
        classification.hint,
        classification.reason,
      ],
    );
    await query(
      `insert into consent_records (lead_id, purpose, text_version, granted)
       values ($1, 'assessment', $2, true)`,
      [leadId, CONSENT_VERSION],
    );
    await query(
      "insert into intake_submissions (idempotency_key, lead_id, public_code) values ($1, $2, $3)",
      [input.idempotencyKey, leadId, publicCode],
    );
    await auditWith(query, {
      action: "lead.assessment_created",
      entityType: "lead",
      entityId: leadId,
      metadata: { scenario: classification.hint, status: classification.leadStatus },
    });
    return { publicCode, duplicate: false as const, hint: classification.hint };
  });
}

export async function createContactLead(input: ContactInput) {
  const existing = await findSubmission(input.idempotencyKey);
  if (existing) return { publicCode: existing, duplicate: true as const };

  return withTransaction(async (query) => {
    const publicCode = await nextPublicCode(query);
    const leads = await query<{ id: string }>(
      `insert into leads (public_code, full_name, email, contact_preference, phone, source, status)
       values ($1, $2, $3, $4, $5, 'website_contact', 'NEW')
       returning id`,
      [publicCode, input.fullName, input.email.toLowerCase(), input.contactPreference, input.phone ?? null],
    );
    const leadId = leads[0]?.id;
    if (!leadId) throw new Error("lead_insert_failed");
    const conversations = await query<{ id: string }>(
      `insert into conversations (lead_id, channel, status) values ($1, 'website', 'open') returning id`,
      [leadId],
    );
    await query(
      `insert into messages (conversation_id, direction, body, category) values ($1, 'inbound', $2, 'contact')`,
      [conversations[0]?.id, input.message],
    );
    await query(
      `insert into lead_status_events (lead_id, to_status, note) values ($1, 'NEW', 'İletişim formu')`,
      [leadId],
    );
    await query(
      `insert into consent_records (lead_id, purpose, text_version, granted) values ($1, 'contact', $2, true)`,
      [leadId, CONSENT_VERSION],
    );
    await query(
      "insert into intake_submissions (idempotency_key, lead_id, public_code) values ($1, $2, $3)",
      [input.idempotencyKey, leadId, publicCode],
    );
    await auditWith(query, { action: "lead.contact_created", entityType: "lead", entityId: leadId });
    return { publicCode, duplicate: false as const };
  });
}

export async function createManualLead(input: {
  actorId: string;
  fullName: string;
  email?: string;
  contactPreference: string;
  country?: string;
  notes?: string;
}) {
  return withTransaction(async (query) => {
    const publicCode = await nextPublicCode(query);
    const leads = await query<{ id: string }>(
      `insert into leads (public_code, full_name, email, contact_preference, country, notes, source, status)
       values ($1, $2, $3, $4, $5, $6, 'manual', 'NEW')
       returning id`,
      [
        publicCode,
        input.fullName,
        input.email ? input.email.toLowerCase() : null,
        input.contactPreference,
        input.country || null,
        input.notes || null,
      ],
    );
    const leadId = leads[0]?.id;
    if (!leadId) throw new Error("lead_insert_failed");
    await query(
      `insert into lead_status_events (lead_id, to_status, actor_id, note) values ($1, 'NEW', $2, 'Elle kayıt')`,
      [leadId, input.actorId],
    );
    await auditWith(query, {
      actorId: input.actorId,
      action: "lead.manual_created",
      entityType: "lead",
      entityId: leadId,
    });
    return { id: leadId, publicCode };
  });
}

export async function listLeads(filters: { q?: string; status?: string; scenario?: string }) {
  const params: unknown[] = [];
  const where = ["deleted_at is null"];
  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }
  if (filters.scenario) {
    params.push(filters.scenario);
    where.push(`scenario_hint = $${params.length}`);
  }
  if (filters.q) {
    params.push(`%${escapeLike(filters.q)}%`);
    where.push(
      `(full_name ilike $${params.length} escape '\\' or coalesce(email, '') ilike $${params.length} escape '\\' or public_code ilike $${params.length} escape '\\')`,
    );
  }
  params.push(100);
  const rows = await sql<LeadRow>(
    `select id, public_code, full_name, email, contact_preference, phone, telegram_handle, instagram_handle,
            country, age_range, licence_classes, licence_country, experience_range, eu_eea_licence,
            code95_status, german_level, intent, source, status, scenario_hint, notes, last_contact_at,
            follow_up_on::text, created_at, updated_at, deleted_at
     from leads
     where ${where.join(" and ")}
     order by created_at desc
     limit $${params.length}`,
    params,
  );
  return rows.map(mapList);
}

export async function getLead(id: string) {
  if (!isUuid(id)) return null;
  const leads = await sql<LeadRow>(
    `select id, public_code, full_name, email, contact_preference, phone, telegram_handle, instagram_handle,
            country, age_range, licence_classes, licence_country, experience_range, eu_eea_licence,
            code95_status, german_level, intent, source, status, scenario_hint, notes, last_contact_at,
            follow_up_on::text, created_at, updated_at, deleted_at
     from leads where id = $1`,
    [id],
  );
  const lead = leads[0];
  if (!lead || lead.deleted_at) return null;
  const [events, notes, assessments, conversations, orders, payments, appointments] = await Promise.all([
    sql(
      `select id, from_status, to_status, note, created_at from lead_status_events
       where lead_id = $1 order by created_at`,
      [id],
    ),
    sql(
      `select n.id, n.body, n.counts_as_contact, n.created_at, p.display_name as author
       from lead_notes n left join profiles p on p.id = n.author_id
       where n.lead_id = $1 order by n.created_at desc`,
      [id],
    ),
    sql(
      `select id, answers, classification, classification_reason, created_at
       from lead_assessments where lead_id = $1 order by created_at desc`,
      [id],
    ),
    sql(
      `select c.id, c.channel, c.status, c.created_at,
              (select count(*)::int from messages m where m.conversation_id = c.id) as message_count
       from conversations c where c.lead_id = $1 order by c.created_at`,
      [id],
    ),
    sql(`select id, status, created_at from service_orders where lead_id = $1 order by created_at desc`, [id]),
    sql(
      `select id, provider, status, amount_cents, currency, verified_via_webhook, created_at
       from payments where lead_id = $1 order by created_at desc`,
      [id],
    ),
    sql(
      `select id, starts_at, ends_at, status from appointments where lead_id = $1 order by starts_at`,
      [id],
    ),
  ]);
  const messages = conversations.length
    ? await sql(
        `select m.id, m.conversation_id, m.direction, m.body, m.category, m.created_at
         from messages m
         join conversations c on c.id = m.conversation_id
         where c.lead_id = $1
         order by m.created_at`,
        [id],
      )
    : [];
  return {
    ...mapList(lead),
    contactPreference: lead.contact_preference,
    phone: lead.phone,
    telegramHandle: lead.telegram_handle,
    instagramHandle: lead.instagram_handle,
    ageRange: lead.age_range,
    licenceClasses: jsonArray(lead.licence_classes),
    licenceCountry: lead.licence_country,
    experienceRange: lead.experience_range,
    euEeaLicence: lead.eu_eea_licence,
    code95Status: lead.code95_status,
    germanLevel: lead.german_level,
    intent: lead.intent,
    notes: lead.notes,
    updatedAt: lead.updated_at,
    events,
    notesList: notes,
    assessments,
    conversations,
    messages,
    orders,
    payments,
    appointments,
  };
}

export async function changeLeadStatus(input: {
  actorId: string;
  leadId: string;
  status: LeadStatus;
  note?: string;
}) {
  if (!isUuid(input.leadId)) return false;
  return withTransaction(async (query) => {
    const current = await query<{ status: string }>(
      "select status from leads where id = $1 and deleted_at is null",
      [input.leadId],
    );
    if (!current[0]) return false;
    await query("update leads set status = $1, updated_at = now() where id = $2", [input.status, input.leadId]);
    await query(
      `insert into lead_status_events (lead_id, from_status, to_status, actor_id, note) values ($1, $2, $3, $4, $5)`,
      [input.leadId, current[0].status, input.status, input.actorId, input.note || null],
    );
    await auditWith(query, {
      actorId: input.actorId,
      action: "lead.status_changed",
      entityType: "lead",
      entityId: input.leadId,
      metadata: { from: current[0].status, to: input.status },
    });
    return true;
  });
}

export async function addLeadNote(input: {
  actorId: string;
  leadId: string;
  body: string;
  countsAsContact: boolean;
}) {
  if (!isUuid(input.leadId)) return false;
  await sql(
    `insert into lead_notes (lead_id, author_id, body, counts_as_contact) values ($1, $2, $3, $4)`,
    [input.leadId, input.actorId, input.body, input.countsAsContact],
  );
  if (input.countsAsContact) {
    await sql("update leads set last_contact_at = now(), updated_at = now() where id = $1 and deleted_at is null", [
      input.leadId,
    ]);
  }
  await audit({
    actorId: input.actorId,
    action: "lead.note_added",
    entityType: "lead",
    entityId: input.leadId,
    metadata: { contact: input.countsAsContact },
  });
  return true;
}

export async function setFollowUp(actorId: string, leadId: string, followUpOn: string | null) {
  if (!isUuid(leadId)) return false;
  await sql("update leads set follow_up_on = $1, updated_at = now() where id = $2 and deleted_at is null", [
    followUpOn,
    leadId,
  ]);
  await audit({
    actorId,
    action: "lead.follow_up_set",
    entityType: "lead",
    entityId: leadId,
    metadata: { set: Boolean(followUpOn) },
  });
  return true;
}

export async function exportLead(actorId: string, leadId: string) {
  const lead = await getLead(leadId);
  if (!lead) return null;
  await audit({ actorId, action: "lead.exported", entityType: "lead", entityId: leadId });
  return lead;
}

export async function anonymizeLead(actorId: string, leadId: string) {
  if (!isUuid(leadId)) return false;
  await withTransaction(async (query) => {
    const current = await query<{ id: string }>("select id from leads where id = $1 and deleted_at is null", [leadId]);
    if (!current[0]) return;
    await query(
      `update leads set
         full_name = 'Silinmiş kayıt',
         email = null,
         phone = null,
         telegram_handle = null,
         instagram_handle = null,
         notes = null,
         status = 'CLOSED',
         deleted_at = now(),
         updated_at = now()
       where id = $1`,
      [leadId],
    );
    await query("delete from lead_notes where lead_id = $1", [leadId]);
    await query(
      `update lead_assessments set answers = '{"redacted":true}'::jsonb where lead_id = $1`,
      [leadId],
    );
    await query("update lead_status_events set note = null where lead_id = $1", [leadId]);
    await query(
      `update messages set body = '[silindi]'
       where conversation_id in (select id from conversations where lead_id = $1)`,
      [leadId],
    );
    await query(
      `update deletion_requests set status = 'completed', completed_at = now(), lead_id = $1
       where lead_id = $1 and status = 'pending'`,
      [leadId],
    );
    await auditWith(query, {
      actorId,
      action: "lead.anonymized",
      entityType: "lead",
      entityId: leadId,
    });
  });
  return true;
}

export async function requestDeletion(email: string) {
  await sql("insert into deletion_requests (email, status) values ($1, 'pending')", [email.toLowerCase()]);
  await audit({ action: "privacy.deletion_requested", metadata: { channel: "website" } });
}

export async function listDeletionRequests() {
  return sql(
    `select id, email, status, requested_at, completed_at, lead_id
     from deletion_requests order by requested_at desc limit 50`,
  );
}

export async function rejectDeletion(actorId: string, requestId: string) {
  if (!isUuid(requestId)) return;
  await sql(
    "update deletion_requests set status = 'rejected', completed_at = now() where id = $1 and status = 'pending'",
    [requestId],
  );
  await audit({ actorId, action: "privacy.deletion_rejected", entityType: "deletion_request", entityId: requestId });
}

export async function dashboardData() {
  const [counts, sales, activity, failures, integrations, automations, upcoming] = await Promise.all([
    sql<{
      total_leads: number;
      today_leads: number;
      consultations: number;
      active_customers: number;
      payment_pending_leads: number;
      telegram_conversations: number;
    }>(
      `select
         (select count(*)::int from leads where deleted_at is null) as total_leads,
         (select count(*)::int from leads
            where deleted_at is null
              and created_at >= (date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin')
         ) as today_leads,
         (select count(*)::int from leads where deleted_at is null and status = 'CONSULTATION_PENDING') as consultations,
         (select count(*)::int from leads where deleted_at is null and status = 'ACTIVE') as active_customers,
         (select count(*)::int from leads where deleted_at is null and status = 'PAYMENT_PENDING') as payment_pending_leads,
         (select count(*)::int from conversations where channel = 'telegram') as telegram_conversations`,
    ),
    sql<{ sales_count: number; sales_cents: number; pending_payments: number }>(
      `select
         (select count(*)::int from payments where status = 'succeeded' and verified_via_webhook) as sales_count,
         (select coalesce(sum(amount_cents), 0)::int from payments where status = 'succeeded' and verified_via_webhook) as sales_cents,
         (select count(*)::int from payments where status = 'pending') as pending_payments`,
    ),
    sql<{ id: string; action: string; entity_type: string | null; created_at: string }>(
      `select id, action, entity_type, created_at from audit_logs order by created_at desc limit 8`,
    ),
    sql<{ id: string; kind: string; last_error: string | null; finished_at: string | null }>(
      `select id, kind, last_error, finished_at from automation_jobs where status = 'failed' order by created_at desc limit 5`,
    ),
    sql<{ provider: string; status: string; last_error: string | null }>(
      "select provider, status, last_error from integration_accounts order by provider",
    ),
    sql<{ kind: string; enabled: boolean }>("select kind, enabled from automation_settings order by kind"),
    sql<{ upcoming: number }>(
      `select count(*)::int as upcoming from appointments
       where status in ('requested', 'confirmed')
         and starts_at >= now()
         and starts_at < now() + interval '7 days'`,
    ),
  ]);
  return {
    counts: counts[0],
    sales: sales[0],
    activity,
    failures,
    integrations,
    automations,
    upcoming: num(upcoming[0]?.upcoming),
  };
}
