import { connection } from "next/server";
import { cookies } from "next/headers";
import { de } from "@/lib/i18n/de";
import { tr } from "@/lib/i18n/tr";

export type Locale = "tr" | "de";

export async function getLocale(): Promise<Locale> {
  await connection();
  const value = (await cookies()).get("rota_locale")?.value;
  return value === "de" ? "de" : "tr";
}

export async function getDictionary(locale?: Locale) {
  const resolved = locale ?? (await getLocale());
  return resolved === "de" ? de : tr;
}
