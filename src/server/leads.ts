import "server-only";

import { audit, auditWith } from "@/server/audit";
import { sql, withTransaction, type QueryFn } from "@/server/db";
import { classifyAssessment, classifyPrecheck } from "@/lib/domain/classify";
import type { LeadStatus, ScenarioHint } from "@/lib/domain/labels";
import { isTrackerStage } from "@/lib/domain/tracker";
import { escapeLike, isUuid, jsonArray, num } from "@/lib/format";
import { createPublicCode, isApplicationCode } from "@/lib/public-code";
import { attachReceived } from "@/server/tracker";
import type { AssessmentInput, ContactInput, JourneyInput } from "@/lib/validation/assessment";

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
  ceIntent: string | null;
  src3Status: string | null;
  familyStatus: string | null;
  germanLevel: string | null;
  followUpOn: string | null;
  createdAt: string;
  lastContactAt: string | null;
  trackerStage: string;
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
  ce_intent: string | null;
  src3_status: string | null;
  family_status: string | null;
  spouse_german: string | null;
  children_ages: string | null;
  city: string | null;
  marketing_opt_in: boolean;
  pipeline_stage: string;
  tracker_stage: string;
  availability: string | null;
  scenario_hint: ScenarioHint | null;
  notes: string | null;
  contact_channels: unknown;
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
    ceIntent: row.ce_intent,
    src3Status: row.src3_status,
    familyStatus: row.family_status,
    germanLevel: row.german_level,
    followUpOn: row.follow_up_on,
    createdAt: row.created_at,
    lastContactAt: row.last_contact_at,
    trackerStage: row.tracker_stage,
  };
}

export async function allocatePublicCode(query: QueryFn): Promise<string> {
  const year = new Date().getUTCFullYear();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createPublicCode(year);
    const taken = await query<{ id: string }>("select id from leads where public_code = $1", [code]);
    if (taken.length === 0) return code;
  }
  throw new Error("code_allocation_failed");
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
    const publicCode = await allocatePublicCode(query);
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
    await attachReceived(query, leadId, {
      title: "Yeni başvuru",
      body: `${publicCode} · web ön değerlendirme`,
      href: `/admin/adaylar/${leadId}`,
    });
    await auditWith(query, {
      action: "lead.assessment_created",
      entityType: "lead",
      entityId: leadId,
      metadata: { scenario: classification.hint, status: classification.leadStatus },
    });
    return { publicCode, duplicate: false as const, hint: classification.hint };
  });
}

export async function createTelegramLead(input: {
  fullName: string;
  telegramHandle: string | null;
  telegramUserId?: string | null;
  country: string | null;
  ce: "yes" | "no" | null;
  experienceRange: string | null;
  germanLevel: string | null;
  status: "NEEDS_REVIEW" | "CONSULTATION_PENDING";
  scenario: "INSUFFICIENT_INFORMATION" | "NEEDS_REVIEW";
  note: string;
  followUpOn: string | null;
}) {
  return withTransaction(async (query) => {
    const publicCode = await allocatePublicCode(query);
    const licence = input.ce === "yes" ? ["CE"] : [];
    const leads = await query<{ id: string }>(
      `insert into leads (
         public_code, full_name, contact_preference, telegram_handle, telegram_user_id, country,
         licence_classes, experience_range, eu_eea_licence, code95_status, german_level,
         intent, age_range, source, status, scenario_hint, notes, follow_up_on, last_contact_at
       ) values (
         $1, $2, 'telegram', $3, $4, $5,
         $6::jsonb, $7, 'unknown', 'unknown', $8,
         'unsure', 'undisclosed', 'telegram', $9, $10, $11, $12, now()
       ) returning id`,
      [
        publicCode,
        input.fullName,
        input.telegramHandle,
        input.telegramUserId ?? null,
        input.country,
        JSON.stringify(licence),
        input.experienceRange,
        input.germanLevel,
        input.status,
        input.scenario,
        input.note,
        input.followUpOn,
      ],
    );
    const leadId = leads[0]?.id;
    if (!leadId) throw new Error("lead_insert_failed");
    await query(
      `insert into lead_status_events (lead_id, to_status, note) values ($1, $2, $3)`,
      [leadId, input.status, input.note],
    );
    await query(
      `insert into consent_records (lead_id, purpose, text_version, granted) values ($1, 'telegram_chat', $2, true)`,
      [leadId, CONSENT_VERSION],
    );
    await attachReceived(query, leadId, {
      title: "Yeni başvuru",
      body: `${publicCode} · Telegram`,
      href: `/admin/adaylar/${leadId}`,
    });
    await auditWith(query, {
      action: "lead.telegram_created",
      entityType: "lead",
      entityId: leadId,
      metadata: { status: input.status },
    });
    return { id: leadId, publicCode };
  });
}

function selectedChannels(input: JourneyInput) {
  return {
    channels: ["email"] as const,
    phone: null,
    email: input.email.trim().toLowerCase(),
    telegram: null,
    preference: "email" as const,
  };
}

export async function findRecentMatch(input: { fullName: string; phone: string | null; email: string | null; telegram: string | null }) {
  const phone = (input.phone ?? "").replace(/\D/g, "");
  const rows = await sql<{ public_code: string }>(
    `select public_code from leads
     where deleted_at is null and merged_into is null
       and lower(full_name) = lower($1)
       and created_at > now() - interval '30 minutes'
       and (
         ($2 <> '' and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $2)
         or ($3 <> '' and lower(coalesce(email, '')) = $3)
         or ($4 <> '' and lower(replace(coalesce(telegram_handle, ''), '@', '')) = lower(replace($4, '@', '')))
       )
     order by created_at desc
     limit 1`,
    [input.fullName.trim(), phone, (input.email ?? "").toLowerCase(), input.telegram ?? ""],
  );
  return rows[0]?.public_code ?? null;
}

export async function createJourneyLead(input: JourneyInput) {
  const existing = await findSubmission(input.idempotencyKey);
  if (existing) return { publicCode: existing, duplicate: true as const };
  const contact = selectedChannels(input);
  const recent = await findRecentMatch({
    fullName: input.fullName,
    phone: contact.phone,
    email: contact.email,
    telegram: contact.telegram,
  });
  if (recent) return { publicCode: recent, duplicate: true as const };
  const country = input.residence === "OTHER" ? (input.residenceDetail?.trim() || "OTHER") : input.residence;
  const classification = classifyPrecheck({
    residenceCountry: input.residence,
    residenceDetail: input.residenceDetail,
    ceIntent: input.ce,
    src3: input.src3,
    experienceRange: input.experience,
  });
  return withTransaction(async (query) => {
    const version = await query<{ id: string }>("select id from legislation_versions where is_active = true limit 1");
    const publicCode = await allocatePublicCode(query);
    const leads = await query<{ id: string }>(
      `insert into leads (
         public_code, full_name, email, contact_preference, phone, telegram_handle, city, country, availability, licence_classes,
         experience_range, eu_eea_licence, code95_status, german_level, intent, age_range,
         ce_intent, src3_status, family_status, spouse_german, children_ages, marketing_opt_in, contact_channels,
         source, status, scenario_hint, notes
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,
         $11,null,null,$12,null,null,
         $13,$14,$15,$16,$17,$18,$19::jsonb,
         'website_assessment',$20,$21,$22
       ) returning id`,
      [
        publicCode,
        input.fullName,
        contact.email,
        contact.preference,
        contact.phone,
        contact.telegram,
        input.city,
        country,
        input.availability ?? null,
        JSON.stringify(input.ce === "have" ? ["CE"] : []),
        input.experience,
        input.german ?? null,
        input.ce,
        input.src3,
        input.family ?? null,
        input.family && input.family !== "alone" ? (input.spouseGerman ?? null) : null,
        input.family === "family" ? (input.childrenAges || null) : null,
        input.marketingOptIn,
        JSON.stringify(contact.channels),
        classification.leadStatus,
        classification.hint,
        input.note?.trim()
          ? `Ön kayıt. İlk aşamada belge istenmez.\n${input.note.trim().slice(0, 500)}`
          : "Ön kayıt. İlk aşamada belge istenmez.",
      ],
    );
    const leadId = leads[0]?.id;
    if (!leadId) throw new Error("lead_insert_failed");
    await query(`insert into lead_status_events (lead_id, to_status, note) values ($1, $2, $3)`, [
      leadId,
      classification.leadStatus,
      classification.reason,
    ]);
    await query(
      `insert into lead_assessments (lead_id, legislation_version_id, answers, classification, classification_reason, disclaimer_ack)
       values ($1, $2, $3::jsonb, $4, $5, true)`,
      [leadId, version[0]?.id ?? null, JSON.stringify(input), classification.hint, classification.reason],
    );
    await query(`insert into consent_records (lead_id, purpose, text_version, granted) values ($1, 'assessment', $2, true)`, [
      leadId,
      CONSENT_VERSION,
    ]);
    await query(
      `insert into consent_records (lead_id, purpose, text_version, granted) values ($1, 'marketing', $2, $3)`,
      [leadId, CONSENT_VERSION, input.marketingOptIn],
    );
    await query("insert into intake_submissions (idempotency_key, lead_id, public_code) values ($1, $2, $3)", [
      input.idempotencyKey,
      leadId,
      publicCode,
    ]);
    await attachReceived(query, leadId, {
      title: "Yeni başvuru",
      body: `${publicCode} · ücretsiz ön değerlendirme`,
      href: `/admin/adaylar/${leadId}`,
    });
    await auditWith(query, {
      action: "lead.journey_created",
      entityType: "lead",
      entityId: leadId,
      metadata: { scenario: classification.hint },
    });
    return { publicCode, duplicate: false as const };
  });
}

export async function leadStatusByCode(code: string) {
  if (!isApplicationCode(code)) return null;
  const rows = await sql<{ status: LeadStatus }>(
    "select status from leads where public_code = $1 and deleted_at is null and merged_into is null",
    [code],
  );
  return rows[0]?.status ?? null;
}

export async function phoneSuggestions(leadId: string, phone: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return [];
  return sql<{ id: string; public_code: string; full_name: string }>(
    `select id, public_code, full_name from leads
     where deleted_at is null and merged_into is null and id <> $1
       and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $2
     limit 5`,
    [leadId, digits],
  );
}

export async function mergeLeads(actorId: string, sourceId: string, targetCode: string) {
  const code = targetCode.trim().toUpperCase();
  if (!isUuid(sourceId) || !isApplicationCode(code)) return { ok: false as const, detail: "Dosya bulunamadı." };
  return withTransaction(async (query) => {
    const target = await query<{ id: string }>(
      "select id from leads where public_code = $1 and deleted_at is null and merged_into is null",
      [code],
    );
    const targetId = target[0]?.id;
    if (!targetId || targetId === sourceId) return { ok: false as const, detail: "Dosya bulunamadı." };
    const moved = await query<{ id: string }>(
      `update leads set merged_into = $2, status = 'CLOSED', updated_at = now()
       where id = $1 and deleted_at is null and merged_into is null
       returning id`,
      [sourceId, targetId],
    );
    if (!moved[0]) return { ok: false as const, detail: "Dosya birleştirilemedi." };
    await query("update conversations set lead_id = $2, updated_at = now() where lead_id = $1", [sourceId, targetId]);
    await auditWith(query, {
      actorId,
      action: "lead.merged",
      entityType: "lead",
      entityId: targetId,
      metadata: { manual: true },
    });
    return { ok: true as const, detail: "Kayıtlar elle birleştirildi." };
  });
}

export async function createContactLead(input: ContactInput) {
  const existing = await findSubmission(input.idempotencyKey);
  if (existing) return { publicCode: existing, duplicate: true as const };

  const email = input.email.trim().toLowerCase();
  const storedMessage = `Konu: ${input.subject.trim()}\n\n${input.message.trim()}`;
  return withTransaction(async (query) => {
    const publicCode = await allocatePublicCode(query);
    const leads = await query<{ id: string }>(
      `insert into leads (public_code, full_name, email, contact_preference, contact_channels, source, status)
       values ($1, $2, $3, 'email', '["email"]'::jsonb, 'website_contact', 'NEW')
       returning id`,
      [publicCode, input.fullName, email],
    );
    const leadId = leads[0]?.id;
    if (!leadId) throw new Error("lead_insert_failed");
    const conversations = await query<{ id: string }>(
      `insert into conversations (lead_id, channel, status) values ($1, 'website', 'open') returning id`,
      [leadId],
    );
    await query(
      `insert into messages (conversation_id, direction, body, category) values ($1, 'inbound', $2, 'contact')`,
      [conversations[0]?.id, storedMessage],
    );
    await query(
      `insert into lead_status_events (lead_id, to_status, note) values ($1, 'NEW', 'İletişim formu')`,
      [leadId],
    );
    await query(
      `insert into contact_messages (lead_id, full_name, email, message, contact_preference, status)
       values ($1, $2, $3, $4, 'email', 'new')`,
      [leadId, input.fullName, email, storedMessage],
    );
    await query(
      `insert into consent_records (lead_id, purpose, text_version, granted) values ($1, 'contact', $2, true)`,
      [leadId, CONSENT_VERSION],
    );
    await query(
      "insert into intake_submissions (idempotency_key, lead_id, public_code) values ($1, $2, $3)",
      [input.idempotencyKey, leadId, publicCode],
    );
    await attachReceived(query, leadId, {
      title: "Yeni iletişim talebi",
      body: `${publicCode} · iletişim formu`,
      href: "/admin/iletisim",
    });
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
    const publicCode = await allocatePublicCode(query);
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
    await attachReceived(query, leadId, {
      title: "Yeni başvuru",
      body: `${publicCode} · elle kayıt`,
      href: `/admin/adaylar/${leadId}`,
    });
    await auditWith(query, {
      actorId: input.actorId,
      action: "lead.manual_created",
      entityType: "lead",
      entityId: leadId,
    });
    return { id: leadId, publicCode };
  });
}

export async function listLeads(filters: {
  q?: string;
  status?: string;
  scenario?: string;
  ce?: string;
  src3?: string;
  german?: string;
  family?: string;
  source?: string;
  waiting?: string;
  tracker?: string;
}) {
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
  if (filters.ce === "have") where.push(`(ce_intent = 'have' or licence_classes @> '["CE"]'::jsonb)`);
  if (filters.ce === "planning") where.push(`ce_intent = 'planning'`);
  if (filters.src3 === "have" || filters.src3 === "planning" || filters.src3 === "info") {
    params.push(filters.src3);
    where.push(`src3_status = $${params.length}`);
  }
  if (filters.german) {
    params.push(filters.german);
    where.push(`german_level = $${params.length}`);
  }
  if (filters.family === "alone" || filters.family === "spouse" || filters.family === "family") {
    params.push(filters.family);
    where.push(`family_status = $${params.length}`);
  }
  if (filters.source === "website_assessment" || filters.source === "website_contact" || filters.source === "telegram" || filters.source === "whatsapp" || filters.source === "manual") {
    params.push(filters.source);
    where.push(`source = $${params.length}`);
  }
  if (filters.waiting === "human") {
    where.push(`exists (select 1 from conversations c where c.lead_id = leads.id and c.status = 'waiting_human')`);
  }
  if (filters.waiting === "consultation") where.push(`status = 'CONSULTATION_PENDING'`);
  if (filters.tracker && isTrackerStage(filters.tracker)) {
    params.push(filters.tracker);
    where.push(`tracker_stage = $${params.length}`);
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
            code95_status, german_level, intent, source, status, ce_intent, src3_status, family_status,
            spouse_german, children_ages, city, marketing_opt_in, pipeline_stage, tracker_stage, availability, scenario_hint, notes, contact_channels, last_contact_at,
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
            code95_status, german_level, intent, source, status, ce_intent, src3_status, family_status,
            spouse_german, children_ages, city, marketing_opt_in, pipeline_stage, tracker_stage, availability, scenario_hint, notes, contact_channels, last_contact_at,
            follow_up_on::text, created_at, updated_at, deleted_at
     from leads where id = $1`,
    [id],
  );
  const lead = leads[0];
  if (!lead || lead.deleted_at) return null;
  const [events, notes, assessments, conversations, orders, payments, appointments, trackerEvents] = await Promise.all([
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
      `select c.id, c.channel, c.status, c.external_thread_id, c.created_at,
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
    sql(
      `select e.id, e.from_stage, e.to_stage, e.public_message, e.created_at, p.display_name as actor
       from tracker_events e
       left join profiles p on p.id = e.actor_id
       where e.lead_id = $1
       order by e.created_at`,
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
    city: lead.city,
    spouseGerman: lead.spouse_german,
    childrenAges: lead.children_ages,
    marketingOptIn: Boolean(lead.marketing_opt_in),
    contactChannels: jsonArray(lead.contact_channels),
    pipelineStage: lead.pipeline_stage,
    availability: lead.availability,
    trackerEvents,
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
         city = null,
         children_ages = null,
         spouse_german = null,
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
