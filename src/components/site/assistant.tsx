"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { requestHumanAction } from "@/server/actions/operations";

type Copy = {
  title: string;
  unavailable: string;
  reason: string;
  human: string;
  apply: string;
  faq: string;
  name: string;
  email: string;
  message: string;
  consent: string;
  send: string;
  sent: string;
  close: string;
  open: string;
  placeholder: string;
  thinking: string;
  error: string;
  sendChat: string;
  track: string;
};

type ChatMessage = { role: "user" | "assistant"; text: string };

export function Assistant({ copy }: { copy: Copy }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"unknown" | "chat" | "off">("unknown");
  const [human, setHuman] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || mode !== "unknown") return;
    let cancelled = false;
    fetch("/api/assistant")
      .then((response) => response.json())
      .then((payload: { configured?: boolean }) => {
        if (cancelled) return;
        const stored = sessionStorage.getItem("rota-assistant");
        if (stored) setConversationId(stored);
        setMode(payload.configured ? "chat" : "off");
      })
      .catch(() => {
        if (!cancelled) setMode("off");
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, pending]);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    setError(null);
    setMessages((current) => [...current, { role: "user", text }]);
    setPending(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, companyWebsite: website }),
      });
      if (!response.ok && response.status !== 200) {
        const payload = await response.json().catch(() => null) as { code?: string; fallback?: string } | null;
        if (payload?.code === "unconfigured") setMode("off");
        setMessages((current) => [...current, { role: "assistant", text: payload?.fallback || copy.error }]);
        return;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream") || !response.body) {
        const payload = await response.json().catch(() => null) as { code?: string; fallback?: string; ignored?: boolean } | null;
        if (payload?.code === "unconfigured") setMode("off");
        if (!payload?.ignored) setMessages((current) => [...current, { role: "assistant", text: payload?.fallback || copy.error }]);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let carry = "";
      let answer = "";
      setMessages((current) => [...current, { role: "assistant", text: "" }]);
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        carry += decoder.decode(chunk.value, { stream: true });
        const parts = carry.split("\n\n");
        carry = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((item) => item.startsWith("data:"));
          if (!line) continue;
          const payload = JSON.parse(line.slice(5).trim()) as { delta?: string; conversationId?: string; done?: boolean };
          if (payload.conversationId) {
            setConversationId(payload.conversationId);
            sessionStorage.setItem("rota-assistant", payload.conversationId);
          }
          if (payload.delta) {
            answer += payload.delta;
            const visible = answer;
            setMessages((current) => {
              const next = [...current];
              next[next.length - 1] = { role: "assistant", text: visible };
              return next;
            });
          }
        }
      }
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: copy.error }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-40">
      {open ? (
        <section className="mb-3 flex max-h-[min(36rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="font-serif text-xl">{copy.title}</p>
            <button type="button" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>{copy.close}</button>
          </div>
          {mode !== "chat" ? (
            <div className="space-y-3 p-4">
              <p className="text-sm leading-6">{copy.unavailable}</p>
              <p className="text-sm leading-6 text-muted-foreground">{copy.reason}</p>
              <Link href="/on-degerlendirme" className="block rounded-full bg-accent px-4 py-2 text-center text-sm text-accent-foreground">{copy.apply}</Link>
              <Link href="/sss" className="block rounded-full border border-border px-4 py-2 text-center text-sm">{copy.faq}</Link>
              <Link href="/basvuru-takip" className="block rounded-full border border-border px-4 py-2 text-center text-sm">{copy.track}</Link>
              <button type="button" className="w-full rounded-full border border-border px-4 py-2 text-sm" onClick={() => setHuman(true)}>{copy.human}</button>
            </div>
          ) : (
            <>
              <div ref={scroller} className="min-h-48 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? <p className="text-sm leading-6 text-muted-foreground">{copy.placeholder}</p> : null}
                {messages.map((item, index) => (
                  <p key={`${item.role}-${index}`} className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-6 ${item.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {item.text || (pending ? copy.thinking : "")}
                  </p>
                ))}
              </div>
              <form className="flex gap-2 border-t border-border p-3" onSubmit={ask}>
                <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={copy.placeholder} className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm" />
                <button type="submit" disabled={pending} className="h-11 rounded-full bg-accent px-4 text-sm text-accent-foreground">{copy.sendChat}</button>
              </form>
              <button type="button" className="px-4 pb-3 text-left text-xs text-muted-foreground" onClick={() => setHuman(true)}>{copy.human}</button>
            </>
          )}
          {human ? (
            <form
              className="grid gap-2 border-t border-border p-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setPending(true);
                setError(null);
                const result = await requestHumanAction({
                  fullName: form.get("fullName"),
                  email: form.get("email"),
                  message: form.get("message"),
                  consent: form.get("consent") === "on",
                  companyWebsite: website,
                });
                setPending(false);
                if (!result.ok) {
                  setError(copy.error);
                  return;
                }
                setDone(result.publicCode);
              }}
            >
              {done ? <p className="text-sm">{copy.sent} {done ?? ""}</p> : (
                <>
                  <input name="fullName" required minLength={3} placeholder={copy.name} className="h-11 rounded-xl border border-input bg-background px-3 text-sm" />
                  <input name="email" type="email" placeholder={copy.email} className="h-11 rounded-xl border border-input bg-background px-3 text-sm" />
                  <textarea name="message" required minLength={5} placeholder={copy.message} className="min-h-20 rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                  <label className="flex gap-2 text-xs leading-5"><input type="checkbox" name="consent" required />{copy.consent}</label>
                  {error ? <p className="text-xs text-destructive">{error}</p> : null}
                  <button type="submit" disabled={pending} className="h-11 rounded-full bg-accent text-sm text-accent-foreground">{copy.send}</button>
                </>
              )}
            </form>
          ) : null}
          <input className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </section>
      ) : null}
      <button type="button" onClick={() => setOpen((value) => !value)} className="h-12 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground shadow-lg">
        {copy.open}
      </button>
    </div>
  );
}
