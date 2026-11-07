import "server-only";

import { STATUS_LABEL, type LeadStatus } from "@/lib/domain/labels";
import { takeWhatsappTurn, normalizeWaStep, type WaDraft, type WaReply } from "@/lib/whatsapp/engine";
import type { WaEvent } from "@/lib/whatsapp/parse";
import { withinServiceWindow } from "@/lib/whatsapp/window";
import { audit } from "@/server/audit";
import { sql, withTransaction } from "@/server/db";
import { createWhatsappLead, leadStatusByCode } from "@/server/leads";
import { allowRate, hashValue } from "@/server/rate-limit";
import { telegramCall, telegramCredentials } from "@/server/telegram/api";
import { displayDigits, whatsappCall, whatsappCredentials } from "@/server/whatsapp/api";

type SessionRow = { step: string; draft: unknown; conversation_id: string; lead_id: string | null; status: string };

function draftOf(value: unknown): WaDraft {
  if (!value || typeof value !== "object") return {};
  return value as WaDraft;
}

async function ensureConversation(chatKey: string): Promise<SessionRow> {
  return withTransaction(async (query) => {
    const conversations = await query<{ id: string; lead_id: string | null; status: string }>(
      `insert into conversations (channel, external_thread_id, status)
       values ('whatsapp', $1, 'open')
       on conflict (channel, external_thread_id)
       do update set updated_at = now()
       returning id, lead_id, status`,
      [chatKey],
    );
    const conversation = conversations[0];
    if (!conversation) throw new Error("conversation_failed");
    await query(
      `insert into whatsapp_sessions (chat_key, step, draft)
       values ($1, 'idle', '{}'::jsonb)
       on conflict (chat_key) do nothing`,
      [chatKey],
    );
    const sessions = await query<{ step: string; draft: unknown }>(
      "select step, draft from whatsapp_sessions where chat_key = $1",
      [chatKey],
    );
    return {
      step: sessions[0]?.step ?? "idle",
      draft: sessions[0]?.draft ?? {},
      conversation_id: conversation.id,
      lead_id: conversation.lead_id,
      status: conversation.status,
    };
  });
}

async function remember(chatKey: string, step: string, draft: WaDraft) {
  await sql(
    `update whatsapp_sessions set step = $2, draft = $3::jsonb, updated_at = now() where chat_key = $1`,
    [chatKey, step, JSON.stringify(draft)],
  );
}

async function storeMessage(
  conversationId: string,
  direction: "inbound" | "outbound",
  body: string,
  category: string,
  externalId: string | null,
  delivery: string | null,
) {
  await sql(
    `insert into messages (conversation_id, direction, body, category, external_id, delivery_status)
     values ($1, $2, $3, $4, $5, $6)`,
    [conversationId, direction, body.slice(0, 2000), category, externalId, delivery],
  );
}

function interactive(replyItem: WaReply) {
  if (replyItem.buttons.length === 0) return null;
  if (replyItem.buttons.length <= 3) {
    return {
      type: "button",
      body: { text: replyItem.text },
      action: { buttons: replyItem.buttons.map((button) => ({ type: "reply", reply: { id: button.id, title: button.title } })) },
    };
  }
  return {
    type: "list",
    body: { text: replyItem.text },
    action: {
      button: "Seçenek",
      sections: [{ title: "Seçim", rows: replyItem.buttons.map((button) => ({ id: button.id, title: button.title })) }],
    },
  };
}

async function deliver(chatKey: string, replies: WaReply[], conversationId: string, live: boolean) {
  const phone = chatKey.startsWith("wa:") ? chatKey.slice(3) : "";
  const credentials = whatsappCredentials();
  const canSend = live && phone !== "desk" && Boolean(credentials) && /^\d{8,15}$/.test(phone);
  for (const item of replies) {
    if (!canSend || !credentials) {
      await storeMessage(conversationId, "outbound", item.text, live ? "send_failed" : "desk", null, "unsent");
      continue;
    }
    const markup = interactive(item);
    const sent = await whatsappCall(`/${credentials.phoneNumberId}/messages`, {
      body: markup
        ? { messaging_product: "whatsapp", to: phone, type: "interactive", interactive: markup }
        : { messaging_product: "whatsapp", to: phone, type: "text", text: { preview_url: false, body: item.text } },
    });
    const messageId = sent.ok ? String((sent.result.messages as Array<{ id?: string }> | undefined)?.[0]?.id ?? "") : "";
    await storeMessage(
      conversationId,
      "outbound",
      item.text,
      sent.ok ? "whatsapp" : "send_failed",
      messageId || null,
      sent.ok ? "sent" : "failed",
    );
    if (!sent.ok && (sent.statusCode === 401 || sent.statusCode === 403)) {
      await sql(
        `update integration_accounts set status = 'error', last_error = $1, updated_at = now() where provider = 'whatsapp'`,
        ["Bağlantı hatası."],
      );
    }
  }
}

async function notifyAdmin(publicCode: string | null) {
  const chat = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() ?? "";
  if (!telegramCredentials() || !/^-?\d{5,20}$/.test(chat)) return;
  const code = publicCode ? ` Dosya ${publicCode}.` : "";
  await telegramCall("sendMessage", {
    chat_id: chat,
    text: `WhatsApp yazışmasında insan desteği istendi.${code} Mesaj kutusuna bakın.`,
  });
}

async function openLead(session: SessionRow, draft: WaDraft, phone: string | null, handoff: boolean) {
  if (session.lead_id) {
    const rows = await sql<{ public_code: string }>("select public_code from leads where id = $1", [session.lead_id]);
    if (handoff) {
      await sql(
        `update leads set status = 'CONSULTATION_PENDING', follow_up_on = current_date + 1, last_contact_at = now(), updated_at = now()
         where id = $1 and deleted_at is null`,
        [session.lead_id],
      );
      await sql("update conversations set status = 'waiting_human', updated_at = now() where id = $1", [session.conversation_id]);
    }
    return rows[0]?.public_code ?? null;
  }
  const created = await createWhatsappLead({ draft, phone, handoff });
  await sql("update conversations set lead_id = $2, updated_at = now() where id = $1 and lead_id is null", [
    session.conversation_id,
    created.id,
  ]);
  if (handoff) {
    await sql("update conversations set status = 'waiting_human', updated_at = now() where id = $1", [session.conversation_id]);
  }
  return created.publicCode;
}

export async function runWhatsappTurn(input: { chatKey: string; text: string; button: string | null; live: boolean }) {
  if (!/^(wa:desk|wa:\d{8,15})$/.test(input.chatKey)) return { ok: false as const, reason: "chat" as const };
  const allowed = await allowRate(`whatsapp:${hashValue(input.chatKey)}`, 40, 60);
  if (!allowed) return { ok: false as const, reason: "rate" as const };
  const session = await ensureConversation(input.chatKey);
  const inbound = input.button && input.button !== "media" ? input.button : input.text || (input.button === "media" ? "Medya saklanmadı." : "");
  if (inbound) await storeMessage(session.conversation_id, "inbound", inbound, "whatsapp", null, null);
  if (session.status === "waiting_human") {
    return { ok: true as const, paused: true as const };
  }
  const welcome = await sql<{ enabled: boolean }>("select enabled from automation_settings where kind = 'whatsapp_welcome'");
  const turn = takeWhatsappTurn({
    text: input.button ? "" : input.text,
    button: input.button === "media" ? null : input.button,
    step: normalizeWaStep(session.step),
    draft: draftOf(session.draft),
    welcomeEnabled: Boolean(welcome[0]?.enabled),
  });
  const phone = input.chatKey === "wa:desk" ? null : input.chatKey.slice(3);
  let code: string | null = null;
  if (turn.effect.type === "lead") code = await openLead(session, turn.effect.draft, phone, false);
  if (turn.effect.type === "handoff") {
    code = await openLead(session, draftOf(session.draft), phone, true);
    await notifyAdmin(code);
  }
  let replies = turn.replies;
  if (turn.effect.type === "track") {
    const status = await leadStatusByCode(turn.effect.code);
    const label = status ? STATUS_LABEL[status as LeadStatus] ?? status : "Bu numarayla açık dosya görünmüyor.";
    replies = [{ text: `${turn.effect.code}: ${label}. Bu bir onay değildir.`, buttons: [] }];
  }
  if (code && turn.effect.type === "lead") {
    replies = [...replies, { text: `Dosya ${code}. Onay değildir.`, buttons: [] }];
  }
  await remember(input.chatKey, turn.step, turn.draft);
  await deliver(input.chatKey, replies, session.conversation_id, input.live);
  return { ok: true as const, paused: false as const, code };
}

export async function claimWhatsappEvent(eventKey: string): Promise<boolean> {
  const rows = await sql<{ event_key: string }>(
    "insert into whatsapp_events (event_key) values ($1) on conflict (event_key) do nothing returning event_key",
    [eventKey.slice(0, 220)],
  );
  return rows.length > 0;
}

export async function releaseWhatsappEvent(eventKey: string) {
  await sql("delete from whatsapp_events where event_key = $1", [eventKey.slice(0, 220)]);
}

export async function applyWhatsappEvents(events: WaEvent[], live: boolean) {
  for (const event of events) {
    if (event.kind === "status") {
      const key = `status:${event.id}:${event.status}`;
      if (!(await claimWhatsappEvent(key))) continue;
      await sql("update messages set delivery_status = $2 where external_id = $1", [event.id, event.status]);
      continue;
    }
    const key = `msg:${event.id}`;
    if (!(await claimWhatsappEvent(key))) continue;
    try {
      await runWhatsappTurn({
        chatKey: `wa:${event.from}`,
        text: event.text,
        button: event.button,
        live,
      });
    } catch (error) {
      await releaseWhatsappEvent(key);
      throw error;
    }
  }
}

export async function refreshWhatsappConnection(actorId: string) {
  const credentials = whatsappCredentials();
  if (!credentials) {
    await sql(
      `update integration_accounts set status = 'disconnected', last_error = $1, updated_at = now() where provider = 'whatsapp'`,
      ["Kurulum bekleniyor."],
    );
    await audit({ actorId, action: "whatsapp.check", metadata: { connected: false } });
    return { status: "disconnected" as const, detail: "Kurulum bekleniyor." };
  }
  const result = await whatsappCall(`/${credentials.phoneNumberId}?fields=display_phone_number,verified_name`, { method: "GET" });
  if (!result.ok) {
    const broken = result.statusCode === 401 || result.statusCode === 403;
    await sql(
      `update integration_accounts set status = $1, last_error = $2, updated_at = now() where provider = 'whatsapp'`,
      [broken ? "error" : "disconnected", broken ? "Bağlantı hatası." : "Kurulum bekleniyor."],
    );
    await audit({ actorId, action: "whatsapp.check", metadata: { connected: false } });
    return { status: broken ? ("error" as const) : ("disconnected" as const), detail: broken ? "Bağlantı hatası." : "Kurulum bekleniyor." };
  }
  const digits = displayDigits(String(result.result.display_phone_number ?? ""));
  await sql(
    `update integration_accounts
     set status = 'connected', external_account_id = $1, last_error = null, updated_at = now()
     where provider = 'whatsapp'`,
    [digits],
  );
  await audit({ actorId, action: "whatsapp.check", metadata: { connected: true } });
  return { status: "connected" as const, detail: "Bağlı" };
}

export async function publicWhatsappLink(): Promise<string | null> {
  const rows = await sql<{ status: string; external_account_id: string | null }>(
    "select status, external_account_id from integration_accounts where provider = 'whatsapp'",
  );
  const digits = rows[0]?.external_account_id ?? "";
  if (rows[0]?.status !== "connected" || !/^\d{8,15}$/.test(digits)) return null;
  return `https://wa.me/${digits}`;
}

export async function sendWhatsappStaffReply(actorId: string, conversationId: string, text: string) {
  const body = text.trim();
  if (body.length < 1 || body.length > 1000) return { sent: false, detail: "Metin boş veya çok uzun." };
  const rows = await sql<{ external_thread_id: string | null; channel: string }>(
    "select external_thread_id, channel from conversations where id = $1",
    [conversationId],
  );
  const thread = rows[0];
  if (!thread || thread.channel !== "whatsapp" || !thread.external_thread_id) return { sent: false, detail: "Sohbet bulunamadı." };
  const phone = thread.external_thread_id.startsWith("wa:") ? thread.external_thread_id.slice(3) : "";
  if (phone === "desk" || !whatsappCredentials() || !/^\d{8,15}$/.test(phone)) {
    await storeMessage(conversationId, "outbound", body, "admin_unsent", null, "unsent");
    await audit({ actorId, action: "whatsapp.reply_unsent", entityType: "conversation", metadata: { sent: false } });
    return { sent: false, detail: "Kayda geçti. WhatsApp'a gitmedi." };
  }
  const last = await sql<{ created_at: string }>(
    `select created_at from messages
     where conversation_id = $1 and direction = 'inbound'
     order by created_at desc limit 1`,
    [conversationId],
  );
  if (!withinServiceWindow(last[0] ? new Date(last[0].created_at) : null)) {
    await storeMessage(conversationId, "outbound", body, "admin_unsent", null, "failed");
    await audit({ actorId, action: "whatsapp.reply_window", entityType: "conversation", metadata: { sent: false } });
    return { sent: false, detail: "24 saatlik pencere kapalı. Onaylı şablon yok, mesaj gönderilmedi." };
  }
  const credentials = whatsappCredentials();
  if (!credentials) return { sent: false, detail: "Kurulum bekleniyor." };
  const sent = await whatsappCall(`/${credentials.phoneNumberId}/messages`, {
    body: { messaging_product: "whatsapp", to: phone, type: "text", text: { preview_url: false, body } },
  });
  const messageId = sent.ok ? String((sent.result.messages as Array<{ id?: string }> | undefined)?.[0]?.id ?? "") : "";
  await storeMessage(conversationId, "outbound", body, sent.ok ? "admin" : "send_failed", messageId || null, sent.ok ? "sent" : "failed");
  await audit({ actorId, action: "whatsapp.reply", entityType: "conversation", metadata: { sent: sent.ok } });
  return { sent: sent.ok, detail: sent.ok ? "Gönderildi." : "Gönderilemedi." };
}

export async function setWhatsappPaused(actorId: string, conversationId: string, paused: boolean) {
  const rows = await sql<{ id: string }>("select id from conversations where id = $1 and channel = 'whatsapp'", [conversationId]);
  if (!rows[0]) return false;
  await sql("update conversations set status = $2, updated_at = now() where id = $1", [
    conversationId,
    paused ? "waiting_human" : "open",
  ]);
  await storeMessage(
    conversationId,
    "outbound",
    paused ? "Ekip yazışmayı devraldı. Otomatik cevap durdu." : "Otomatik cevap yeniden açık.",
    "internal",
    null,
    "unsent",
  );
  await audit({ actorId, action: paused ? "whatsapp.pause" : "whatsapp.resume", entityType: "conversation", metadata: { paused } });
  return true;
}

export async function listThreads(channel: string, humanOnly: boolean) {
  const params: unknown[] = [];
  const where = ["c.channel in ('whatsapp', 'telegram')"];
  if (channel === "whatsapp" || channel === "telegram") {
    params.push(channel);
    where.push(`c.channel = $${params.length}`);
  }
  if (humanOnly) where.push("c.status = 'waiting_human'");
  return sql<{
    id: string;
    channel: string;
    status: string;
    external_thread_id: string | null;
    updated_at: string;
    public_code: string | null;
    lead_id: string | null;
  }>(
    `select c.id, c.channel, c.status, c.external_thread_id, c.updated_at, l.public_code, c.lead_id
     from conversations c
     left join leads l on l.id = c.lead_id
     where ${where.join(" and ")}
     order by c.updated_at desc
     limit 40`,
    params,
  );
}

export async function threadMessages(conversationId: string) {
  return sql<{ id: string; direction: string; body: string; category: string | null; delivery_status: string | null; created_at: string }>(
    `select id, direction, body, category, delivery_status, created_at
     from messages where conversation_id = $1 order by created_at`,
    [conversationId],
  );
}

export async function whatsappDesk() {
  const rows = await sql<{ step: string }>("select step from whatsapp_sessions where chat_key = 'wa:desk'");
  return normalizeWaStep(rows[0]?.step ?? "idle");
}

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
