import "server-only";

import type { QueryFn } from "@/server/db";
import { sql } from "@/server/db";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

async function write(query: QueryFn, input: AuditInput) {
  await query(
    `insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [
      input.actorId ?? null,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

export async function audit(input: AuditInput) {
  await write(sql, input);
}

export async function auditWith(query: QueryFn, input: AuditInput) {
  await write(query, input);
}
