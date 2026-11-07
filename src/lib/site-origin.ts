export function publicOrigin(): string | null {
  const raw = process.env.APP_PUBLIC_URL?.trim() || process.env.APP_URL?.trim() || "";
  if (!raw.startsWith("https://")) return null;
  try {
    const url = new URL(raw);
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}
