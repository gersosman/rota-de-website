import "server-only";

import { audit, auditWith } from "@/server/audit";
import { dataStoreMode, sql, withTransaction } from "@/server/db";
import { num } from "@/lib/format";
import {
  companySchema,
  emptyCompany,
  type CompanyProfile,
  type legislationSchema,
} from "@/lib/validation/assessment";
import type { z } from "zod";

export async function activeLegislation() {
  const rows = await sql(
    `select id, version_label, review_status, summary_tr, summary_de,
            abs1_label_tr, abs1_label_de, abs1_note_tr, abs1_note_de,
            abs2_label_tr, abs2_label_de, abs2_note_tr, abs2_note_de,
            is_active, updated_at
     from legislation_versions
     where is_active = true
     limit 1`,
  );
  return rows[0] ?? null;
}

export async function listLegislation() {
  return sql(
    `select id, version_label, review_status, is_active, updated_at
     from legislation_versions order by created_at desc`,
  );
}

export async function saveLegislation(actorId: string, input: z.infer<typeof legislationSchema>) {
  await withTransaction(async (query) => {
    await query("update legislation_versions set is_active = false, updated_at = now() where is_active = true");
    const rows = await query<{ id: string }>(
      `insert into legislation_versions (
         version_label, review_status, summary_tr, summary_de,
         abs1_label_tr, abs1_label_de, abs1_note_tr, abs1_note_de,
         abs2_label_tr, abs2_label_de, abs2_note_tr, abs2_note_de, is_active
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)
       returning id`,
      [
        input.versionLabel,
        input.reviewStatus,
        input.summaryTr,
        input.summaryDe,
        input.abs1LabelTr,
        input.abs1LabelDe,
        input.abs1NoteTr,
        input.abs1NoteDe,
        input.abs2LabelTr,
        input.abs2LabelDe,
        input.abs2NoteTr,
        input.abs2NoteDe,
      ],
    );
    await auditWith(query, {
      actorId,
      action: "legislation.version_created",
      entityType: "legislation_version",
      entityId: rows[0]?.id ?? null,
      metadata: { review: input.reviewStatus },
    });
  });
}

export async function listFaqs(locale?: "tr" | "de", publishedOnly = false) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (locale) {
    params.push(locale);
    where.push(`locale = $${params.length}`);
  }
  if (publishedOnly) where.push("published = true");
  return sql(
    `select id, locale, question, answer, published, source_note, updated_at
     from faq_entries
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by updated_at desc`,
    params,
  );
}

export async function saveFaq(
  actorId: string,
  input: { id?: string; locale: "tr" | "de"; question: string; answer: string; published: boolean; sourceNote?: string },
) {
  if (input.id) {
    await sql(
      `update faq_entries
       set locale = $1, question = $2, answer = $3, published = $4, source_note = $5, updated_at = now()
       where id = $6`,
      [input.locale, input.question, input.answer, input.published, input.sourceNote || null, input.id],
    );
    await audit({ actorId, action: "faq.updated", entityType: "faq", entityId: input.id });
    return;
  }
  const rows = await sql<{ id: string }>(
    `insert into faq_entries (locale, question, answer, published, source_note)
     values ($1, $2, $3, $4, $5) returning id`,
    [input.locale, input.question, input.answer, input.published, input.sourceNote || null],
  );
  await audit({ actorId, action: "faq.created", entityType: "faq", entityId: rows[0]?.id ?? null });
}

export async function deleteFaq(actorId: string, id: string) {
  await sql("delete from faq_entries where id = $1", [id]);
  await audit({ actorId, action: "faq.deleted", entityType: "faq", entityId: id });
}

export async function getCompany(): Promise<CompanyProfile> {
  const rows = await sql<{ value: unknown }>("select value from app_settings where key = 'company'");
  const parsed = companySchema.safeParse(rows[0]?.value ?? {});
  return parsed.success ? parsed.data : emptyCompany();
}

export async function saveCompany(actorId: string, company: CompanyProfile) {
  await sql(
    `insert into app_settings (key, value, updated_at) values ('company', $1::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(company)],
  );
  await audit({ actorId, action: "settings.company_updated", entityType: "app_settings" });
}

export async function getRetention() {
  const rows = await sql<{ value: { leadDays?: number; auditDays?: number; note?: string } }>(
    "select value from app_settings where key = 'retention'",
  );
  const value = rows[0]?.value;
  return {
    leadDays: num(value?.leadDays) || 730,
    auditDays: num(value?.auditDays) || 365,
    note: typeof value?.note === "string" ? value.note : "",
  };
}

export async function saveRetention(actorId: string, leadDays: number, auditDays: number) {
  const current = await getRetention();
  await sql(
    `insert into app_settings (key, value, updated_at) values ('retention', $1::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify({ leadDays, auditDays, note: current.note })],
  );
  await audit({
    actorId,
    action: "settings.retention_updated",
    metadata: { leadDays, auditDays },
  });
}

export async function purgeByRetention(actorId: string) {
  const retention = await getRetention();
  const leads = await sql<{ id: string }>(
    `select id from leads
     where deleted_at is null
       and status in ('CLOSED', 'COMPLETED')
       and updated_at < now() - make_interval(days => $1::int)`,
    [retention.leadDays],
  );
  for (const lead of leads) {
    const { anonymizeLead } = await import("@/server/leads");
    await anonymizeLead(actorId, lead.id);
  }
  const removed = await sql<{ n: number }>(
    `with deleted as (
       delete from audit_logs
       where created_at < now() - make_interval(days => $1::int)
       returning 1
     ) select count(*)::int as n from deleted`,
    [retention.auditDays],
  );
  await audit({
    actorId,
    action: "settings.retention_purged",
    metadata: { leads: leads.length, auditRows: num(removed[0]?.n) },
  });
  return { leads: leads.length, auditRows: num(removed[0]?.n) };
}

export async function integrationRows() {
  return sql<{ provider: string; status: string; secret_ref: string | null; last_error: string | null; updated_at: string }>(
    "select provider, status, secret_ref, last_error, updated_at from integration_accounts order by provider",
  );
}

export function describeDataStore() {
  return dataStoreMode();
}

export async function publishedServices(locale: "tr" | "de") {
  const rows = await sql<{
    id: string;
    slug: string;
    name_tr: string;
    name_de: string;
    description_tr: string;
    description_de: string;
    price_cents: number | null;
    currency: string;
    legally_separate: boolean;
  }>("select id, slug, name_tr, name_de, description_tr, description_de, price_cents, currency, legally_separate from services where active = true order by name_tr");
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: locale === "de" ? row.name_de : row.name_tr,
    description: locale === "de" ? row.description_de : row.description_tr,
    priceCents: row.price_cents,
    currency: row.currency,
    legallySeparate: row.legally_separate,
  }));
}
