const QUERY_URLS = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"] as const;
const MIGRATION_URLS = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"] as const;

export class DatabaseNotConfiguredError extends Error {
  readonly required = QUERY_URLS;

  constructor() {
    super("database_not_configured");
    this.name = "DatabaseNotConfiguredError";
  }
}

function firstSet(env: NodeJS.ProcessEnv, names: readonly string[]) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return "";
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return firstSet(env, QUERY_URLS);
}

export function resolveMigrationUrl(env: NodeJS.ProcessEnv = process.env) {
  return firstSet(env, MIGRATION_URLS) || resolveDatabaseUrl(env);
}

export function dbFailureKind(error: unknown): "not_configured" | "unreachable" | "query" {
  if (error instanceof DatabaseNotConfiguredError) return "not_configured";
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("During prerendering") ||
    message.includes("`connection()`") ||
    message.includes("DYNAMIC_SERVER_USAGE") ||
    message.includes("couldn't be rendered statically")
  ) {
    return "query";
  }
  if (
    ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "ECONNRESET", "EPERM", "EROFS", "ENOENT", "28000", "28P01", "57P01", "53300", "08001", "08006"].includes(code) ||
    /connect|timeout|ECONN|getaddrinfo|password authentication/i.test(message)
  ) {
    return "unreachable";
  }
  return "query";
}

export function safeDbError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined;
  const message = (error instanceof Error ? error.message : "unknown")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]")
    .slice(0, 180);
  return {
    name: error instanceof Error ? error.name : "unknown",
    code,
    message,
  };
}
