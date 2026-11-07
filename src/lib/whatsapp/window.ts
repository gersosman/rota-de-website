export function withinServiceWindow(lastInbound: Date | null, now = new Date()): boolean {
  if (!lastInbound || Number.isNaN(lastInbound.getTime())) return false;
  const age = now.getTime() - lastInbound.getTime();
  return age >= 0 && age < 24 * 60 * 60 * 1000;
}
