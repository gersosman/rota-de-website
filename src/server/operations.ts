import "server-only";

import { audit, auditWith } from "@/server/audit";
import { allocatePublicCode } from "@/server/leads";
import { attachReceived } from "@/server/tracker";
import { sql, withTransaction } from "@/server/db";
import { isPipelineStage, type PipelineStage } from "@/lib/domain/pipeline";
import { isUuid } from "@/lib/format";

export type OutcomeCounts = {
  applications: number;
  precheck: number;
  interview: number;
  contract: number;
  started: number;
};

export async function outcomeCounts(): Promise<OutcomeCounts> {
  const rows = await sql<OutcomeCounts>(
    `select
       count(*) filter (
         where merged_into is null and source in ('website_assessment', 'telegram', 'manual')
       )::int as applications,
       count(*) filter (
         where merged_into is null
           and exists (select 1 from lead_assessments a where a.lead_id = leads.id)
       )::int as precheck,
       count(*) filter (where merged_into is null and pipeline_stage = 'interview')::int as interview,
       count(*) filter (where merged_into is null and pipeline_stage = 'contract')::int as contract,
       count(*) filter (where merged_into is null and pipeline_stage = 'started')::int as started
     from leads
     where deleted_at is null`,
  );
  const row = rows[0];
  return {
    applications: Number(row?.applications ?? 0),
    precheck: Number(row?.precheck ?? 0),
    interview: Number(row?.interview ?? 0),
    contract: Number(row?.contract ?? 0),
    started: Number(row?.started ?? 0),
  };
}

export async function setPipelineStage(actorId: string, leadId: string, stage: string, note: string) {
  if (!isUuid(leadId) || !isPipelineStage(stage)) return false;
  return withTransaction(async (query) => {
    const current = await query<{ pipeline_stage: string }>(
      "select pipeline_stage from leads where id = $1 and deleted_at is null",
      [leadId],
    );
    if (!current[0]) return false;
    await query("update leads set pipeline_stage = $1, updated_at = now() where id = $2", [stage, leadId]);
    await query(
      `insert into pipeline_events (lead_id, from_stage, to_stage, actor_id, note) values ($1, $2, $3, $4, $5)`,
      [leadId, current[0].pipeline_stage, stage, actorId, note || null],
    );
    await auditWith(query, {
      actorId,
      action: "lead.pipeline_changed",
      entityType: "lead",
      entityId: leadId,
      metadata: { from: current[0].pipeline_stage, to: stage },
    });
    return true;
  });
}

export async function pipelineEvents(leadId: string) {
  if (!isUuid(leadId)) return [];
  return sql<{ id: string; from_stage: string | null; to_stage: string; note: string | null; created_at: string }>(
    `select id, from_stage, to_stage, note, created_at from pipeline_events where lead_id = $1 order by created_at`,
    [leadId],
  );
}

const CONTACT_STATUS = ["new", "reviewing", "waiting", "answered", "closed"] as const;

export async function listContactMessages() {
  return sql<{
    id: string;
    full_name: string;
    email: string;
    message: string;
    contact_preference: string;
    status: string;
    admin_notes: string | null;
    created_at: string;
    public_code: string | null;
  }>(
    `select m.id, m.full_name, m.email, m.message, m.contact_preference, m.status, m.admin_notes, m.created_at, l.public_code
     from contact_messages m
     left join leads l on l.id = m.lead_id
     order by m.created_at desc
     limit 80`,
  );
}

export async function updateContactMessage(actorId: string, id: string, status: string, notes: string) {
  if (!isUuid(id) || !(CONTACT_STATUS as readonly string[]).includes(status)) return false;
  await sql(
    `update contact_messages set status = $2, admin_notes = $3, assigned_to = $4, updated_at = now() where id = $1`,
    [id, status, notes.slice(0, 2000) || null, actorId],
  );
  await audit({ actorId, action: "contact.updated", entityType: "contact_message", entityId: id, metadata: { status } });
  return true;
}

export async function createSupportRequest(input: { fullName: string; message: string; email?: string; phone?: string }) {
  const fullName = input.fullName.trim().slice(0, 120);
  const message = input.message.trim().slice(0, 2000);
  const email = input.email?.trim().toLowerCase().slice(0, 180) || "";
  const phone = input.phone?.trim().slice(0, 20) || "";
  if (fullName.length < 3 || message.length < 5) return { ok: false as const };
  const preference = email ? "email" : phone ? "phone" : "unspecified";
  return withTransaction(async (query) => {
    const publicCode = await allocatePublicCode(query);
    const leads = await query<{ id: string }>(
      `insert into leads (public_code, full_name, email, phone, contact_preference, source, status, notes)
       values ($1, $2, $3, $4, $5, 'website_contact', 'CONSULTATION_PENDING', $6)
       returning id`,
      [publicCode, fullName, email || null, phone || null, preference, "İnsan desteği talebi."],
    );
    const leadId = leads[0]?.id;
    if (!leadId) throw new Error("lead_insert_failed");
    await query(
      `insert into conversations (lead_id, channel, status) values ($1, 'website', 'waiting_human')`,
      [leadId],
    );
    await query(
      `insert into contact_messages (lead_id, full_name, email, message, contact_preference, status)
       values ($1, $2, $3, $4, $5, 'new')`,
      [leadId, fullName, email || "belirtilmedi", message, preference],
    );
    await attachReceived(query, leadId, {
      title: "Destek talebi",
      body: `${publicCode} · site asistanı`,
      href: `/admin/adaylar/${leadId}`,
    });
    await auditWith(query, { action: "support.requested", entityType: "lead", entityId: leadId, metadata: { human: true } });
    return { ok: true as const, publicCode };
  });
}

export async function listEmployers() {
  return sql<{ id: string; company_name: string; city: string | null; company_status: string }>(
    "select id, company_name, city, company_status from employers order by created_at desc limit 50",
  );
}

export async function listJobs() {
  return sql<{ id: string; job_title: string; status: string; company_name: string; salary_amount: string | null; salary_basis: string | null }>(
    `select j.id, j.job_title, j.status, e.company_name, j.salary_amount::text, j.salary_basis
     from job_opportunities j join employers e on e.id = j.employer_id
     order by j.created_at desc limit 50`,
  );
}

export async function listMatches() {
  return sql<{ id: string; match_status: string; public_code: string; job_title: string; interview_date: string | null }>(
    `select m.id, m.match_status, l.public_code, j.job_title, m.interview_date::text
     from candidate_matches m
     join leads l on l.id = m.candidate_id
     join job_opportunities j on j.id = m.job_opportunity_id
     order by m.created_at desc limit 50`,
  );
}

export async function createEmployer(actorId: string, input: { companyName: string; city: string; contactPerson: string; email: string; phone: string; industry: string; notes: string }) {
  const companyName = input.companyName.trim().slice(0, 160);
  if (companyName.length < 2) return false;
  const rows = await sql<{ id: string }>(
    `insert into employers (company_name, city, contact_person, contact_email, contact_phone, industry, notes)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [
      companyName,
      input.city.trim().slice(0, 80) || null,
      input.contactPerson.trim().slice(0, 120) || null,
      input.email.trim().slice(0, 180) || null,
      input.phone.trim().slice(0, 40) || null,
      input.industry.trim().slice(0, 80) || null,
      input.notes.trim().slice(0, 2000) || null,
    ],
  );
  await audit({ actorId, action: "employer.created", entityType: "employer", entityId: rows[0]?.id, metadata: {} });
  return true;
}

export async function createJob(actorId: string, input: { employerId: string; title: string; location: string; amount: string; basis: string; hours: string; period: string }) {
  if (!isUuid(input.employerId)) return false;
  const title = input.title.trim().slice(0, 160);
  if (title.length < 2) return false;
  const amount = input.amount.trim();
  const basis = input.basis === "gross" || input.basis === "net" ? input.basis : "";
  if (amount && !basis) return false;
  if (amount && !/^\d{1,7}(\.\d{1,2})?$/.test(amount)) return false;
  const rows = await sql<{ id: string }>(
    `insert into job_opportunities (employer_id, job_title, job_location, salary_amount, salary_basis, working_hours, period_note, status)
     values ($1, $2, $3, $4, $5, $6, $7, 'draft') returning id`,
    [input.employerId, title, input.location.trim().slice(0, 120) || null, amount || null, basis || null, input.hours.trim().slice(0, 120) || null, input.period.trim().slice(0, 120) || null],
  );
  await audit({ actorId, action: "job.created", entityType: "job", entityId: rows[0]?.id, metadata: { public: false } });
  return true;
}

export async function createMatch(actorId: string, input: { candidateId: string; jobId: string; status: string; interviewDate: string; feedback: string }) {
  if (!isUuid(input.candidateId) || !isUuid(input.jobId)) return false;
  const status = ["proposed", "interview", "declined", "offer", "contract", "closed"].includes(input.status) ? input.status : "proposed";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.interviewDate) ? input.interviewDate : null;
  const nextStage = status === "contract" ? "contract" : status === "interview" ? "interview" : status === "offer" ? "offer" : status === "proposed" ? "matched" : null;
  if (nextStage) {
    const guard = nextStage === "matched" ? "and pipeline_stage in ('new', 'precheck', 'missing_info', 'suitable')" : "";
    const moved = await sql<{ pipeline_stage: string }>(
      `update leads set pipeline_stage = $2, updated_at = now()
       where id = $1 and deleted_at is null and pipeline_stage is distinct from $2 ${guard}
       returning pipeline_stage`,
      [input.candidateId, nextStage],
    );
    if (moved[0]) {
      await sql(
        `insert into pipeline_events (lead_id, from_stage, to_stage, actor_id, note) values ($1, null, $2, $3, $4)`,
        [input.candidateId, nextStage, actorId, "Eşleştirme kaydı"],
      );
    }
  }
  await sql(
    `insert into candidate_matches (candidate_id, job_opportunity_id, match_status, interview_date, employer_feedback)
     values ($1, $2, $3, $4, $5)`,
    [input.candidateId, input.jobId, status, date, input.feedback.trim().slice(0, 2000) || null],
  );
  await audit({ actorId, action: "match.created", entityType: "lead", entityId: input.candidateId, metadata: { status } });
  return true;
}

export async function publishedStories() {
  return sql<{ id: string; display_name: string; city: string | null; stage_label: string | null; body: string; representative: boolean }>(
    `select id, display_name, city, stage_label, body, representative
     from testimonials
     where approved = true and publication_consent = true and representative = false
     order by published_at desc nulls last
     limit 12`,
  );
}

export async function listTestimonials() {
  return sql<{ id: string; display_name: string; city: string | null; approved: boolean; publication_consent: boolean; representative: boolean; body: string }>(
    `select id, display_name, city, approved, publication_consent, representative, body
     from testimonials order by created_at desc limit 40`,
  );
}

export async function createTestimonial(actorId: string, input: { name: string; city: string; stage: string; body: string; consent: boolean; representative: boolean }) {
  const name = input.name.trim().slice(0, 80);
  const body = input.body.trim().slice(0, 800);
  if (name.length < 2 || body.length < 8) return false;
  await sql(
    `insert into testimonials (display_name, city, stage_label, body, publication_consent, representative, approved, hide_photo)
     values ($1, $2, $3, $4, $5, $6, false, true)`,
    [name, input.city.trim().slice(0, 80) || null, input.stage.trim().slice(0, 80) || null, body, input.consent, input.representative],
  );
  await audit({ actorId, action: "testimonial.created", entityType: "testimonial", metadata: { approved: false } });
  return true;
}

export async function approveTestimonial(actorId: string, id: string, approve: boolean) {
  if (!isUuid(id)) return false;
  const rows = await sql<{ publication_consent: boolean; representative: boolean }>(
    "select publication_consent, representative from testimonials where id = $1",
    [id],
  );
  const row = rows[0];
  if (!row) return false;
  if (approve && (!row.publication_consent || row.representative)) return false;
  await sql(
    `update testimonials set approved = $2, published_at = case when $2 then now() else null end, updated_at = now() where id = $1`,
    [id, approve],
  );
  await audit({ actorId, action: approve ? "testimonial.approved" : "testimonial.unpublished", entityType: "testimonial", entityId: id });
  return true;
}

export async function publishedArticles(locale: string) {
  return sql<{ id: string; title: string; body: string; source_url: string | null; source_label: string | null; reviewed_on: string | null }>(
    `select id, title, body, source_url, source_label, reviewed_on::text
     from knowledge_articles where status = 'published' and locale = $1 order by title`,
    [locale === "de" ? "de" : "tr"],
  );
}

export async function saveArticle(actorId: string, input: { slug: string; locale: string; title: string; body: string; sourceUrl: string; sourceLabel: string; reviewedOn: string }) {
  const slug = input.slug.trim().toLowerCase().slice(0, 80);
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return false;
  const locale = input.locale === "de" ? "de" : "tr";
  const reviewed = /^\d{4}-\d{2}-\d{2}$/.test(input.reviewedOn) ? input.reviewedOn : null;
  await sql(
    `insert into knowledge_articles (slug, locale, title, body, source_url, source_label, reviewed_on, status)
     values ($1, $2, $3, $4, $5, $6, $7, 'draft')
     on conflict (slug, locale) do update set
       title = excluded.title, body = excluded.body, source_url = excluded.source_url,
       source_label = excluded.source_label, reviewed_on = excluded.reviewed_on, status = 'draft', updated_at = now()`,
    [slug, locale, input.title.trim().slice(0, 180), input.body.trim().slice(0, 8000), input.sourceUrl.trim().slice(0, 300) || null, input.sourceLabel.trim().slice(0, 160) || null, reviewed],
  );
  await audit({ actorId, action: "article.drafted", entityType: "article", metadata: { slug, locale } });
  return true;
}

export async function publishArticle(actorId: string, id: string, publish: boolean) {
  if (!isUuid(id)) return false;
  await sql("update knowledge_articles set status = $2, updated_at = now() where id = $1", [id, publish ? "published" : "draft"]);
  await audit({ actorId, action: publish ? "article.published" : "article.unpublished", entityType: "article", entityId: id });
  return true;
}

export async function listArticles() {
  return sql<{ id: string; slug: string; locale: string; title: string; status: string; reviewed_on: string | null }>(
    "select id, slug, locale, title, status, reviewed_on::text from knowledge_articles order by updated_at desc limit 40",
  );
}

export type { PipelineStage };
