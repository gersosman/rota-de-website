import "server-only";

import { readOptional, sql, withTransaction } from "@/server/db";
import { audit } from "@/server/audit";
import { createTelegramLead } from "@/server/leads";
import { linkTelegramTrack } from "@/server/tracker";
import { notifyAdmin } from "@/server/telegram/notify";
import { listFaqs, publishedServices } from "@/server/knowledge";
import { allowRate, hashValue } from "@/server/rate-limit";
import {
  labelForCallback,
  normalizeDraft,
  normalizeStep,
  takeTurn,
  type BotReply,
  type PrecheckDraft,
} from "@/lib/telegram/engine";
import { contactPageUrl, publicWebhookUrl, telegramCall, telegramCredentials } from "@/server/telegram/api";

type Delivery = "telegram" | "desk";

type SessionRow = { step: string; draft: unknown; conversation_id: string; lead_id: string | null; status: string };

function tomorrow(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function cleanHandle(value: string | null | undefined): string | null {
  if (!value) return null;
  const handle = value.replace(/^@/, "");
  return /^[A-Za-z0-9_]{5,32}$/.test(handle) ? `@${handle}` : null;
}

async function contextForTurn() {
  const [services, faqs, welcome] = await Promise.all([
    publishedServices("tr"),
    listFaqs("tr", true),
    sql<{ enabled: boolean }>("select enabled from automation_settings where kind = 'telegram_welcome'"),
  ]);
  return {
    services: services.map((item) => item.name),
    faqs: faqs.map((item) => ({ question: String(item.question), answer: String(item.answer) })),
    welcomeEnabled: Boolean(welcome[0]?.enabled),
    contactUrl: contactPageUrl(),
  };
}

async function ensureConversation(chatKey: string): Promise<SessionRow> {
  return withTransaction(async (query) => {
    const conversations = await query<{ id: string; lead_id: string | null; status: string }>(
      `insert into conversations (channel, external_thread_id, status)
       values ('telegram', $1, 'open')
       on conflict (channel, external_thread_id)
       do update set updated_at = now()
       returning id, lead_id, status`,
      [chatKey],
    );
    const conversation = conversations[0];
    if (!conversation) throw new Error("conversation_failed");
    await query(
      `insert into telegram_sessions (chat_key, step, draft)
       values ($1, 'idle', '{}'::jsonb)
       on conflict (chat_key) do nothing`,
      [chatKey],
    );
    const sessions = await query<{ step: string; draft: unknown }>(
      "select step, draft from telegram_sessions where chat_key = $1",
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

async function remember(chatKey: string, step: string, draft: PrecheckDraft) {
  await sql(
    `update telegram_sessions set step = $2, draft = $3::jsonb, updated_at = now() where chat_key = $1`,
    [chatKey, step, JSON.stringify(draft)],
  );
}

async function attachLead(conversationId: string, leadId: string) {
  await sql(
    "update conversations set lead_id = $2, updated_at = now() where id = $1 and lead_id is null",
    [conversationId, leadId],
  );
}

async function openLead(session: SessionRow, draft: PrecheckDraft, handle: string | null, userId: string | null, handoff: boolean) {
  if (session.lead_id) {
    if (userId) {
      await sql(
        "update leads set telegram_user_id = coalesce(telegram_user_id, $2), updated_at = now() where id = $1 and deleted_at is null",
        [session.lead_id, userId],
      );
    }
    const rows = await sql<{ public_code: string }>("select public_code from leads where id = $1", [session.lead_id]);
    if (handoff) {
      await sql(
        `update leads set status = 'CONSULTATION_PENDING', follow_up_on = $2, last_contact_at = now(), updated_at = now()
         where id = $1 and deleted_at is null`,
        [session.lead_id, tomorrow()],
      );
      await sql("update conversations set status = 'waiting_human', updated_at = now() where id = $1", [session.conversation_id]);
      if (rows[0]?.public_code) {
        await notifyAdmin(`ROTA DE — Destek talebi\n\nBaşvuru No: ${rows[0].public_code}\nKaynak: Telegram\n\nAdmin panelinden görüntüle.`);
      }
    }
    return rows[0]?.public_code ?? null;
  }
  const created = await createTelegramLead({
    fullName: draft.name || "Telegram adayı",
    telegramHandle: handle,
    telegramUserId: userId,
    country: draft.country ?? null,
    ce: draft.ce ?? null,
    experienceRange: draft.experience ?? null,
    germanLevel: draft.german ?? null,
    status: handoff ? "CONSULTATION_PENDING" : "NEEDS_REVIEW",
    scenario: handoff ? "NEEDS_REVIEW" : "INSUFFICIENT_INFORMATION",
    note: handoff ? "Telegram insan talebi. Telefon yok." : "Telegram ön kayıt. Hukuki karar değildir.",
    followUpOn: handoff ? tomorrow() : null,
  });
  await attachLead(session.conversation_id, created.id);
  if (handoff) {
    await sql("update conversations set status = 'waiting_human', updated_at = now() where id = $1", [session.conversation_id]);
  }
  await notifyAdmin(
    [
      handoff ? "ROTA DE — Destek talebi" : "ROTA DE — Yeni başvuru",
      "",
      `Başvuru No: ${created.publicCode}`,
      `Ad Soyad: ${draft.name || "Telegram adayı"}`,
      "Kaynak: Telegram",
      `CE: ${draft.ce === "yes" ? "Var" : draft.ce === "no" ? "Yok" : "Belirtilmedi"}`,
      `Deneyim: ${draft.experience === "y5_plus" ? "5+ yıl" : draft.experience === "y1_3" ? "1–3 yıl" : draft.experience === "none" ? "Yok" : "Belirtilmedi"}`,
      "",
      "Admin panelinden görüntüle.",
    ].join("\n"),
  );
  return created.publicCode;
}

async function trackReply(userId: string | null, code: string, verifier: string) {
  const result = await linkTelegramTrack({ code, verifier, telegramUserId: userId });
  if (!result.ok) return "Kod ve iletişim bilgisi eşleşmedi. Başkasının başvurusu gösterilmez.";
  return `${result.label}\n${result.message}\nBu bir vize veya iş onayı değildir.`;
}

async function adminCommand(chatId: string | null, text: string) {
  const adminId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() ?? "";
  if (!chatId || !adminId || chatId !== adminId) return null;
  const command = text.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (command !== "/status" && command !== "/pending" && command !== "/help") return null;
  if (command === "/help") {
    return "/status bağlantı ve sayılar\n/pending son dosyalar\n/help bu liste\nBu komutlar yalnız tanımlı yönetici sohbetinde çalışır.";
  }
  if (command === "/status") {
    const account = await sql<{ status: string }>("select status from integration_accounts where provider = 'telegram'");
    const counts = await sql<{ pending: number; fresh: number }>(
      `select
         count(*) filter (where status = 'CONSULTATION_PENDING')::int as pending,
         count(*) filter (where status = 'NEW')::int as fresh
       from leads where deleted_at is null and merged_into is null`,
    );
    const state = account[0]?.status === "connected" ? "Bağlı" : "Kurulum bekliyor";
    return `Telegram: ${state}\nGörüşme bekleyen: ${Number(counts[0]?.pending ?? 0)}\nYeni kayıt: ${Number(counts[0]?.fresh ?? 0)}\nToken bu mesaja yazılmaz.`;
  }
  const rows = await sql<{ public_code: string; full_name: string }>(
    `select public_code, full_name from leads
     where deleted_at is null and merged_into is null and status in ('NEW', 'CONSULTATION_PENDING', 'NEEDS_REVIEW')
     order by created_at desc limit 5`,
  );
  if (rows.length === 0) return "Bekleyen kayıt yok.";
  return ["Son kayıtlar:", ...rows.map((row) => `${row.public_code} ${row.full_name}`), "Telefon bu listede yok."].join("\n");
}

export async function listTelegramThreads(humanOnly: boolean) {
  return sql<{ id: string; status: string; external_thread_id: string | null; updated_at: string; public_code: string | null }>(
    `select c.id, c.status, c.external_thread_id, c.updated_at, l.public_code
     from conversations c
     left join leads l on l.id = c.lead_id
     where c.channel = 'telegram' ${humanOnly ? "and c.status = 'waiting_human'" : ""}
     order by c.updated_at desc
     limit 40`,
  );
}

async function storeMessage(conversationId: string, direction: "inbound" | "outbound", body: string, category: string) {
  await sql(
    "insert into messages (conversation_id, direction, body, category) values ($1, $2, $3, $4)",
    [conversationId, direction, body.slice(0, 2000), category],
  );
}

async function deliver(delivery: Delivery, chatId: string | null, replies: BotReply[], conversationId: string) {
  const connected = telegramCredentials() !== null;
  for (const item of replies) {
    if (delivery === "desk" || !connected || !chatId) {
      await storeMessage(conversationId, "outbound", item.text, delivery === "desk" ? "desk" : "send_failed");
      continue;
    }
    const markup = item.buttons.length
      ? { inline_keyboard: item.buttons.map((row) => row.map((button) => ({ text: button.label, callback_data: button.data }))) }
      : undefined;
    const sent = await telegramCall("sendMessage", {
      chat_id: chatId,
      text: item.text,
      ...(markup ? { reply_markup: markup } : {}),
    });
    await storeMessage(conversationId, "outbound", item.text, sent.ok ? "telegram" : "send_failed");
    if (!sent.ok) {
      await sql(
        `update integration_accounts set status = 'error', last_error = $1, updated_at = now() where provider = 'telegram'`,
        [sent.description],
      );
    }
  }
}

export async function runChatTurn(input: {
  chatKey: string;
  chatId: string | null;
  userId?: string | null;
  text: string;
  callback: string | null;
  media: boolean;
  handle: string | null;
  delivery: Delivery;
  callbackId?: string | null;
}) {
  const allowed = await allowRate(`telegram:${hashValue(input.chatKey)}`, 40, 60);
  if (!allowed) {
    return { ok: false as const, reason: "rate" as const };
  }
  const session = await ensureConversation(input.chatKey);
  const adminReply = await adminCommand(input.chatId, input.text);
  if (adminReply) {
    const inbound = input.text.slice(0, 200);
    if (inbound) await storeMessage(session.conversation_id, "inbound", inbound, "admin_command");
    await deliver(input.delivery, input.chatId, [{ text: adminReply, buttons: [] }], session.conversation_id);
    return { ok: true as const, replies: [{ text: adminReply, buttons: [] }], code: null };
  }
  const facts = await contextForTurn();
  const turn = takeTurn({
    text: input.text,
    callback: input.callback,
    media: input.media,
    step: normalizeStep(session.step),
    draft: normalizeDraft(session.draft),
    welcomeEnabled: facts.welcomeEnabled,
    services: facts.services,
    faqs: facts.faqs,
    contactUrl: facts.contactUrl,
  });
  const inbound = input.callback ? labelForCallback(input.callback) : input.text || (input.media ? "Medya gönderildi, saklanmadı." : "");
  if (inbound) await storeMessage(session.conversation_id, "inbound", inbound, turn.category);
  let code: string | null = null;
  if (turn.effect.type === "lead") code = await openLead(session, turn.effect.draft, input.handle, input.userId ?? null, false);
  if (turn.effect.type === "handoff") code = await openLead(session, { name: "Telegram adayı" }, input.handle, input.userId ?? null, true);
  let replies = turn.replies;
  if (turn.effect.type === "track") {
    replies = [{ text: await trackReply(input.userId ?? null, turn.effect.code, turn.effect.verifier), buttons: turn.replies[0]?.buttons ?? [] }];
  }
  replies = code ? [...replies, { text: `Dosya ${code}. Onay değildir.`, buttons: replies[0]?.buttons ?? [] }] : replies;
  await remember(input.chatKey, turn.step, turn.draft);
  await sql("update conversations set updated_at = now() where id = $1", [session.conversation_id]);
  await sql("update leads set last_contact_at = now(), updated_at = now() where id = (select lead_id from conversations where id = $1)", [
    session.conversation_id,
  ]);
  await deliver(input.delivery, input.chatId, replies, session.conversation_id);
  if (input.delivery === "telegram" && input.callbackId && telegramCredentials()) {
    await telegramCall("answerCallbackQuery", { callback_query_id: input.callbackId });
  }
  await sql(
    `insert into automation_jobs (kind, status, idempotency_key, finished_at, attempts)
     values ('telegram_turn', 'succeeded', $1, now(), 1)
     on conflict (idempotency_key) do nothing`,
    [`turn:${input.chatKey}:${Date.now()}`],
  );
  return { ok: true as const, replies, code };
}

export async function claimUpdate(updateId: number): Promise<boolean> {
  const rows = await sql<{ update_id: string }>(
    "insert into telegram_updates (update_id) values ($1) on conflict (update_id) do nothing returning update_id",
    [updateId],
  );
  return rows.length > 0;
}

export async function releaseUpdate(updateId: number) {
  await sql("delete from telegram_updates where update_id = $1", [updateId]);
}

export function parseTelegramUpdate(value: unknown): {
  updateId: number;
  chatId: string;
  text: string;
  callback: string | null;
  callbackId: string | null;
  media: boolean;
  handle: string | null;
  userId: string | null;
} | null {
  if (!value || typeof value !== "object") return null;
  const update = value as Record<string, unknown>;
  const updateId = Number(update.update_id);
  if (!Number.isInteger(updateId) || updateId <= 0) return null;
  const callbackQuery = update.callback_query as Record<string, unknown> | undefined;
  const message = (callbackQuery?.message as Record<string, unknown> | undefined) ?? (update.message as Record<string, unknown> | undefined);
  const chat = message?.chat as Record<string, unknown> | undefined;
  const from = (callbackQuery?.from as Record<string, unknown> | undefined) ?? (message?.from as Record<string, unknown> | undefined);
  const chatId = String(chat?.id ?? "");
  if (!/^-?\d{1,20}$/.test(chatId)) return null;
  const text = typeof message?.text === "string" ? message.text.slice(0, 2000) : "";
  const callback = typeof callbackQuery?.data === "string" ? callbackQuery.data.slice(0, 64) : null;
  const callbackId = typeof callbackQuery?.id === "string" ? callbackQuery.id.slice(0, 120) : null;
  const media = Boolean(message) && !text && !callback;
  const rawUser = from?.id;
  const userId = typeof rawUser === "number" || typeof rawUser === "string" ? String(rawUser) : "";
  return {
    updateId,
    chatId,
    text,
    callback,
    callbackId,
    media,
    handle: cleanHandle(typeof from?.username === "string" ? from.username : null),
    userId: /^\d{1,20}$/.test(userId) ? userId : null,
  };
}

export async function refreshTelegramConnection(actorId: string) {
  const credentials = telegramCredentials();
  if (!credentials) {
    await sql(
      `update integration_accounts
       set status = 'disconnected', external_account_id = null, last_error = $1, updated_at = now()
       where provider = 'telegram'`,
      ["Bot bağlı değil. TELEGRAM_BOT_TOKEN ve TELEGRAM_WEBHOOK_SECRET yok veya biçimi geçersiz."],
    );
    await audit({ actorId, action: "telegram.disconnected", entityType: "integration", metadata: { reason: "missing" } });
    return { ok: false as const, detail: "Bağlı değil. Anahtar yok." };
  }
  const me = await telegramCall("getMe");
  if (!me.ok) {
    await sql(
      `update integration_accounts set status = 'error', last_error = $1, updated_at = now() where provider = 'telegram'`,
      [me.description],
    );
    return { ok: false as const, detail: "Telegram getMe reddetti. Bağlı değil." };
  }
  const username = typeof me.result.username === "string" ? me.result.username : "";
  const safeName = /^[A-Za-z0-9_]{5,32}$/.test(username) ? username : null;
  const hook = publicWebhookUrl();
  if (!hook) {
    await sql(
      `update integration_accounts
       set status = 'disconnected', external_account_id = $1, last_error = $2, updated_at = now()
       where provider = 'telegram'`,
      [safeName, safeName ? `Token doğrulandı (@${safeName}). Webhook kurulmadı: APP_PUBLIC_URL https değil.` : "Token doğrulandı. Kullanıcı adı yok. Webhook kurulmadı."],
    );
    await audit({ actorId, action: "telegram.token_only", entityType: "integration", metadata: { webhook: false } });
    return { ok: false as const, detail: "Token doğrulandı. Webhook kurulmadı, bu yüzden bağlı gösterilmez." };
  }
  const set = await telegramCall("setWebhook", {
    url: hook,
    secret_token: credentials.secret,
    allowed_updates: ["message", "callback_query"],
  });
  if (!set.ok) {
    await sql(
      `update integration_accounts set status = 'error', external_account_id = $1, last_error = $2, updated_at = now() where provider = 'telegram'`,
      [safeName, set.description],
    );
    return { ok: false as const, detail: "Webhook kurulamadı. Bağlı değil." };
  }
  await sql(
    `update integration_accounts
     set status = 'connected', external_account_id = $1, last_error = null, updated_at = now()
     where provider = 'telegram'`,
    [safeName],
  );
  await audit({ actorId, action: "telegram.connected", entityType: "integration", metadata: { webhook: true } });
  return { ok: true as const, detail: safeName ? `@${safeName} bağlı.` : "Webhook kuruldu." };
}

export async function setTelegramWelcome(actorId: string, enabled: boolean) {
  await sql(
    `update automation_settings set enabled = $1, updated_at = now() where kind = 'telegram_welcome'`,
    [enabled],
  );
  await audit({ actorId, action: "telegram.welcome", entityType: "automation", metadata: { enabled } });
}

export async function publicBotLink(): Promise<string | null> {
  const rows = await readOptional<{ status: string; external_account_id: string | null }>(
    "public_bot_link_failed",
    "select status, external_account_id from integration_accounts where provider = 'telegram'",
  );
  if (!rows) return null;
  const name = rows[0]?.external_account_id ?? "";
  if (rows[0]?.status !== "connected" || !/^[A-Za-z0-9_]{5,32}$/.test(name)) return null;
  return `https://t.me/${name}`;
}

export async function telegramOverview() {
  const [account, welcome, threads] = await Promise.all([
    sql<{ status: string; external_account_id: string | null; last_error: string | null }>(
      "select status, external_account_id, last_error from integration_accounts where provider = 'telegram'",
    ),
    sql<{ enabled: boolean }>("select enabled from automation_settings where kind = 'telegram_welcome'"),
    sql<{ id: string; external_thread_id: string | null; status: string; updated_at: string; public_code: string | null }>(
      `select c.id, c.external_thread_id, c.status, c.updated_at, l.public_code
       from conversations c
       left join leads l on l.id = c.lead_id
       where c.channel = 'telegram'
       order by c.updated_at desc
       limit 20`,
    ),
  ]);
  return {
    status: account[0]?.status ?? "disconnected",
    username: account[0]?.external_account_id ?? null,
    detail: account[0]?.last_error ?? "Bot bağlı değil.",
    welcome: Boolean(welcome[0]?.enabled),
    threads,
  };
}

export async function resetDeskChat() {
  await sql(
    `insert into telegram_sessions (chat_key, step, draft)
     values ('desk:local', 'idle', '{}'::jsonb)
     on conflict (chat_key) do update set step = 'idle', draft = '{}'::jsonb, updated_at = now()`,
  );
}

export async function sendStaffReply(actorId: string, chatKey: string, text: string) {
  if (!/^(tg:-?\d{1,20}|desk:local)$/.test(chatKey)) return { sent: false, detail: "Sohbet bulunamadı." };
  const body = text.trim();
  if (body.length < 1 || body.length > 1000) return { sent: false, detail: "Metin boş veya çok uzun." };
  const session = await ensureConversation(chatKey);
  const chatId = chatKey.startsWith("tg:") ? chatKey.slice(3) : null;
  if (!chatId || !telegramCredentials()) {
    await storeMessage(session.conversation_id, "outbound", body, "admin_unsent");
    await audit({ actorId, action: "telegram.reply_unsent", entityType: "conversation", metadata: { sent: false } });
    return { sent: false, detail: "Kayda geçti. Telegram'a gitmedi." };
  }
  const sent = await telegramCall("sendMessage", { chat_id: chatId, text: body });
  await storeMessage(session.conversation_id, "outbound", body, sent.ok ? "admin" : "send_failed");
  await audit({ actorId, action: "telegram.reply", entityType: "conversation", metadata: { sent: sent.ok } });
  return { sent: sent.ok, detail: sent.ok ? "Telegram'a gitti." : "Gönderilemedi. Bağlı kabul edilmez." };
}

export async function threadMessages(chatKey: string) {
  if (!/^(tg:-?\d{1,20}|desk:local)$/.test(chatKey)) return [];
  return sql<{ id: string; direction: string; body: string; category: string | null; created_at: string }>(
    `select m.id, m.direction, m.body, m.category, m.created_at
     from messages m
     join conversations c on c.id = m.conversation_id
     where c.channel = 'telegram' and c.external_thread_id = $1
     order by m.created_at`,
    [chatKey],
  );
}
