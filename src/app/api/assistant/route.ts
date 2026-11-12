import { ASSISTANT_FALLBACK } from "@/lib/assistant/prompt";
import { publicGate } from "@/server/actions/guards";
import {
  assistantConfigured,
  assistantSettings,
  buildModelMessages,
  ensureAssistantConversation,
  knowledgeBlock,
  recentAssistantMessages,
  storeAssistantMessage,
} from "@/server/assistant";
import { allowRate, hashValue } from "@/server/rate-limit";
import { isUuid } from "@/lib/format";
import { dbFailureKind, safeDbError } from "@/server/database-url";

export const instant = false;

export async function GET() {
  try {
    const settings = await assistantSettings();
    return Response.json({
      configured: settings.configured && settings.enabled,
      enabled: settings.enabled,
      modelConnected: settings.configured,
    });
  } catch (error) {
    const kind = dbFailureKind(error);
    console.error("assistant_status_failed", { kind, ...safeDbError(error) });
    if (kind === "query") return Response.json({ ok: false }, { status: 500 });
    return Response.json({ configured: false, enabled: false, modelConnected: false });
  }
}

export async function POST(request: Request) {
  const gate = await publicGate("assistant", 12, 60);
  if (!gate.ok) return Response.json({ ok: false, code: gate.code }, { status: gate.code === "rate" ? 429 : 403 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, code: "invalid" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") return Response.json({ ok: false, code: "invalid" }, { status: 400 });
  const row = payload as Record<string, unknown>;
  if (typeof row.companyWebsite === "string" && row.companyWebsite.trim()) {
    return Response.json({ ok: true, ignored: true });
  }
  const message = typeof row.message === "string" ? row.message.trim() : "";
  if (message.length < 1 || message.length > 1000) return Response.json({ ok: false, code: "invalid" }, { status: 400 });
  const settings = await assistantSettings();
  if (!settings.enabled || !assistantConfigured()) {
    return Response.json({ ok: false, code: "unconfigured" });
  }
  const daily = await allowRate(`assistant-day:${hashValue(gate.ip)}`, settings.dailyLimit, 24 * 60 * 60);
  if (!daily) return Response.json({ ok: false, code: "rate" }, { status: 429 });

  const requested = typeof row.conversationId === "string" && isUuid(row.conversationId) ? row.conversationId : null;
  let conversationId: string;
  try {
    conversationId = await ensureAssistantConversation(requested);
    await storeAssistantMessage(conversationId, "inbound", message);
  } catch (error) {
    console.error("assistant_store_failed", error instanceof Error ? error.name : "error");
    return Response.json({ ok: false, code: "unavailable" }, { status: 503 });
  }

  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const [history, knowledge] = await Promise.all([
    recentAssistantMessages(conversationId),
    knowledgeBlock(),
  ]);
  const prior = history.slice(1);

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      stream: true,
      messages: buildModelMessages(prior, knowledge, message),
    }),
  }).catch((error: unknown) => {
    console.error("assistant_upstream_failed", error instanceof Error ? error.name : "error");
    return null;
  });

  if (!upstream?.ok || !upstream.body) {
    console.error("assistant_upstream_status", upstream?.status ?? 0);
    const fallback = ASSISTANT_FALLBACK;
    await storeAssistantMessage(conversationId, "outbound", fallback).catch(() => undefined);
    return Response.json({ ok: false, code: "unavailable", conversationId, fallback }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let answer = "";
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`));
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          carry += decoder.decode(chunk.value, { stream: true });
          const lines = carry.split("\n");
          carry = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (!delta) continue;
              answer += delta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            } catch {
              console.error("assistant_chunk_skipped");
            }
          }
        }
      } catch (error) {
        console.error("assistant_stream_failed", error instanceof Error ? error.name : "error");
      } finally {
        const text = answer.trim() || ASSISTANT_FALLBACK;
        if (!answer.trim()) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
        await storeAssistantMessage(conversationId, "outbound", text).catch(() => undefined);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
