import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const PUBLIC_CODE = /^ROTA-\d{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
export const LEGACY_CODE = /^RD-\d{4}-\d{5}$/;

export function createPublicCode(year = new Date().getUTCFullYear()): string {
  let body = "";
  for (let index = 0; index < 6; index += 1) body += ALPHABET[randomInt(ALPHABET.length)];
  return `ROTA-${year}-${body}`;
}

export function isApplicationCode(value: string): boolean {
  return PUBLIC_CODE.test(value) || LEGACY_CODE.test(value);
}
