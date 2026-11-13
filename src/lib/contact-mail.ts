const INBOX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InboxCheck = { present: boolean; accepted: boolean };

export function inspectInbox(value: string | undefined | null): InboxCheck {
  if (typeof value !== "string") return { present: false, accepted: false };
  const trimmed = value.trim();
  const present = trimmed.length > 0;
  return {
    present,
    accepted: present && trimmed.length <= 180 && INBOX.test(trimmed),
  };
}

export function resendStatusCode(status: number): "resend_4xx" | "resend_5xx" {
  return status >= 500 ? "resend_5xx" : "resend_4xx";
}

export type ContactBranch = "honeypot" | "invalid" | "origin" | "rate" | "duplicate" | "created" | "unavailable";

export type ContactEmailStatus = "sent" | "pending" | "failed" | "none";

export type ContactLog = {
  branch: ContactBranch;
  reason: "none" | "idempotency" | "ip" | "address";
  recordCreated: boolean;
  inboxPresent: boolean;
  inboxAccepted: boolean;
  queued: boolean;
  attempted: boolean;
  emailStatus: ContactEmailStatus;
  errorCode: string;
};

export function contactTrace(input: {
  branch: ContactBranch;
  reason?: ContactLog["reason"];
  recordCreated: boolean;
  inbox: InboxCheck;
  queued: boolean;
  attempted: boolean;
  emailStatus: ContactEmailStatus;
  errorCode: string;
}): ContactLog {
  return {
    branch: input.branch,
    reason: input.reason ?? "none",
    recordCreated: input.recordCreated,
    inboxPresent: input.inbox.present,
    inboxAccepted: input.inbox.accepted,
    queued: input.queued,
    attempted: input.attempted,
    emailStatus: input.emailStatus,
    errorCode: input.errorCode,
  };
}

export type ContactView = "saved" | "duplicate" | "sent" | "pending" | "unsent";

export function contactResultView(input: {
  duplicate: boolean;
  recordCreated: boolean;
  emailStatus: ContactEmailStatus;
}): ContactView {
  if (input.duplicate) return "duplicate";
  if (!input.recordCreated) return "saved";
  if (input.emailStatus === "sent") return "sent";
  if (input.emailStatus === "pending") return "pending";
  return "unsent";
}

export function contactFollowUp(result: { duplicate: boolean; publicCode: string | null }): "duplicate" | "notify" {
  if (result.duplicate || !result.publicCode) return "duplicate";
  return "notify";
}
