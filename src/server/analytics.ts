import "server-only";

import { sql } from "@/server/db";

export async function funnelCounts() {
  const rows = await sql<{ visits: number; started: number; completed: number }>(
    `select
       count(distinct session_key) filter (where name = 'home_view')::int as visits,
       count(distinct session_key) filter (where name = 'assessment_start')::int as started,
       count(distinct session_key) filter (where name = 'form_complete')::int as completed
     from analytics_events`,
  );
  return {
    visits: Number(rows[0]?.visits ?? 0),
    started: Number(rows[0]?.started ?? 0),
    completed: Number(rows[0]?.completed ?? 0),
  };
}
