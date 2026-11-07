export function nextAttemptDelayMs(attempts: number): number {
  return Math.min(attempts, 5) * 2 * 60 * 1000;
}
