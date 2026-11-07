export type WaMessage = {
  kind: "message";
  id: string;
  from: string;
  text: string;
  button: string | null;
};

export type WaStatus = {
  kind: "status";
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
};

export type WaEvent = WaMessage | WaStatus;

const STATUSES = new Set(["sent", "delivered", "read", "failed"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function parseWhatsappBody(value: unknown): WaEvent[] {
  const root = asRecord(value);
  const entries = Array.isArray(root?.entry) ? root.entry : [];
  const events: WaEvent[] = [];
  for (const entry of entries) {
    const changes = Array.isArray(asRecord(entry)?.changes) ? (asRecord(entry)?.changes as unknown[]) : [];
    for (const change of changes) {
      const payload = asRecord(asRecord(change)?.value);
      if (!payload) continue;
      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      for (const item of messages) {
        const message = asRecord(item);
        if (!message) continue;
        const id = typeof message.id === "string" ? message.id : "";
        const from = typeof message.from === "string" ? message.from : "";
        if (!/^wamid\.[A-Za-z0-9+/=._-]{8,200}$/.test(id) && !/^[A-Za-z0-9._-]{8,200}$/.test(id)) continue;
        if (!/^\d{8,15}$/.test(from)) continue;
        const interactive = asRecord(message.interactive);
        const buttonReply = asRecord(interactive?.button_reply);
        const listReply = asRecord(interactive?.list_reply);
        const legacy = asRecord(message.button);
        const button =
          (typeof buttonReply?.id === "string" && buttonReply.id) ||
          (typeof listReply?.id === "string" && listReply.id) ||
          (typeof legacy?.payload === "string" && legacy.payload) ||
          null;
        const textBody = asRecord(message.text);
        const text = typeof textBody?.body === "string" ? textBody.body : typeof legacy?.text === "string" ? legacy.text : "";
        const media = Boolean(message.image || message.document || message.audio || message.video || message.sticker);
        events.push({
          kind: "message",
          id: id.slice(0, 200),
          from,
          text: text.slice(0, 1000),
          button: button ? button.slice(0, 80) : media && !text ? null : button,
        });
        if (media && !text && !button) {
          events[events.length - 1] = { kind: "message", id: id.slice(0, 200), from, text: "", button: "media" };
        }
      }
      const statuses = Array.isArray(payload.statuses) ? payload.statuses : [];
      for (const item of statuses) {
        const status = asRecord(item);
        if (!status) continue;
        const id = typeof status.id === "string" ? status.id : "";
        const name = typeof status.status === "string" ? status.status : "";
        if (!id || !STATUSES.has(name)) continue;
        events.push({ kind: "status", id: id.slice(0, 200), status: name as WaStatus["status"] });
      }
    }
  }
  return events;
}
