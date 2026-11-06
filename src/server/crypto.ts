import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { sql } from "@/server/db";

async function encryptionKey(): Promise<Buffer> {
  const fromEnv = process.env.APP_ENCRYPTION_KEY?.trim();
  if (fromEnv) return createHash("sha256").update(fromEnv).digest();

  const existing = await sql<{ value: string }>("select value from internal_keys where name = $1", ["data_key"]);
  if (existing[0]?.value) return Buffer.from(existing[0].value, "base64");

  const created = randomBytes(32).toString("base64");
  await sql(
    "insert into internal_keys (name, value) values ($1, $2) on conflict (name) do nothing",
    ["data_key", created],
  );
  const stored = await sql<{ value: string }>("select value from internal_keys where name = $1", ["data_key"]);
  const value = stored[0]?.value;
  if (!value) throw new Error("encryption_key_unavailable");
  return Buffer.from(value, "base64");
}

export async function encryptText(plain: string): Promise<string> {
  const key = await encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export async function decryptText(payload: string): Promise<string> {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("ciphertext_invalid");
  const key = await encryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return plain.toString("utf8");
}
