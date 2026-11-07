import "server-only";

import { sql } from "@/server/db";
import { ASSISTANT_FALLBACK, assistantSystemPrompt } from "@/lib/assistant/prompt";
import { isUuid } from "@/lib/format";

export function assistantConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function assistantSettings(): Promise<{ enabled: boolean; dailyLimit: number; configured: boolean }> {
  const rows = await sql<{ value: { enabled?: boolean; dailyLimit?: number } }>(
    "select value from app_settings where key = 'assistant'",
  );
  const value = rows[0]?.value;
  const daily = Number(value?.dailyLimit);
  return {
    enabled: value?.enabled !== false,
    dailyLimit: Number.isFinite(daily) && daily >= 5 && daily <= 500 ? daily : 40,
    configured: assistantConfigured(),
  };
}

export async function saveAssistantSettings(enabled: boolean, dailyLimit: number) {
  await sql(
    `insert into app_settings (key, value, updated_at) values ('assistant', $1::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify({ enabled, dailyLimit })],
  );
}

export async function listKnowledge() {
  return sql<{ id: string; title: string; body: string; source_url: string | null; enabled: boolean }>(
    "select id, title, body, source_url, enabled from ai_knowledge order by updated_at desc",
  );
}

export async function saveKnowledge(input: { id?: string; title: string; body: string; sourceUrl: string; enabled: boolean }) {
  if (input.id) {
    await sql(
      `update ai_knowledge set title = $2, body = $3, source_url = $4, enabled = $5, updated_at = now() where id = $1`,
      [input.id, input.title, input.body, input.sourceUrl || null, input.enabled],
    );
    return;
  }
  await sql(
    `insert into ai_knowledge (title, body, source_url, enabled) values ($1, $2, $3, $4)`,
    [input.title, input.body, input.sourceUrl || null, input.enabled],
  );
}

export async function listAssistantChats() {
  return sql<{ id: string; created_at: string; body: string }>(
    `select c.id, c.created_at, coalesce((select m.body from messages m where m.conversation_id = c.id order by m.created_at desc limit 1), '') as body
     from conversations c where c.channel = 'assistant' order by c.updated_at desc limit 20`,
  );
}

export async function knowledgeBlock(): Promise<string> {
  const [items, articles, faqs] = await Promise.all([
    sql<{ title: string; body: string; source_url: string | null }>(
      "select title, body, source_url from ai_knowledge where enabled = true order by updated_at desc limit 20",
    ),
    sql<{ title: string; body: string; source_url: string | null }>(
      `select title, body, source_url from knowledge_articles
       where status = 'published' and locale = 'tr' order by updated_at desc limit 8`,
    ),
    sql<{ question: string; answer: string; source_note: string | null }>(
      "select question, answer, source_note from faq_entries where published = true and locale = 'tr' order by updated_at desc limit 12",
    ),
  ]);
  const parts = [
    ...items.map((item) => `${item.title}\n${item.body}${item.source_url ? `\nKaynak: ${item.source_url}` : ""}`),
    ...articles.map((item) => `${item.title}\n${item.body}${item.source_url ? `\nKaynak: ${item.source_url}` : ""}`),
    ...faqs.map((item) => `${item.question}\n${item.answer}${item.source_note ? `\nNot: ${item.source_note}` : ""}`),
  ];
  return parts.join("\n\n").slice(0, 12000);
}

export async function ensureAssistantConversation(id: string | null): Promise<string> {
  if (id && isUuid(id)) {
    const existing = await sql<{ id: string }>(
      "select id from conversations where id = $1 and channel = 'assistant'",
      [id],
    );
    if (existing[0]) return existing[0].id;
  }
  const created = await sql<{ id: string }>(
    `insert into conversations (channel, external_thread_id, status) values ('assistant', $1, 'open') returning id`,
    [`web:${crypto.randomUUID()}`],
  );
  const conversationId = created[0]?.id;
  if (!conversationId) throw new Error("conversation_failed");
  return conversationId;
}

export async function recentAssistantMessages(conversationId: string) {
  return sql<{ direction: string; body: string }>(
    `select direction, body from messages
     where conversation_id = $1 and direction in ('inbound', 'outbound')
     order by created_at desc limit 12`,
    [conversationId],
  );
}

export async function storeAssistantMessage(conversationId: string, direction: "inbound" | "outbound", body: string) {
  await sql(
    `insert into messages (conversation_id, direction, body, category) values ($1, $2, $3, 'assistant')`,
    [conversationId, direction, body.slice(0, 4000)],
  );
}

export function buildModelMessages(history: Array<{ direction: string; body: string }>, knowledge: string, latest: string) {
  const prior = [...history].reverse().map((item) => ({
    role: item.direction === "inbound" ? "user" : "assistant",
    content: item.body,
  }));
  return [
    { role: "system", content: assistantSystemPrompt(knowledge) },
    ...prior,
    { role: "user", content: latest },
  ];
}

export { ASSISTANT_FALLBACK };
