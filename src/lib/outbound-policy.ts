export function nextAttemptDelayMs(attempts: number): number {
  return Math.min(attempts, 5) * 2 * 60 * 1000;
}

export type NoticeState = "sent" | "pending" | "failed";

export function noticeFromJob(status: string | null | undefined): NoticeState {
  if (status === "sent") return "sent";
  if (status === "pending") return "pending";
  return "failed";
}
