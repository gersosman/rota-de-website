"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/security/origin";

export async function setLocaleAction(formData: FormData) {
  const locale = formData.get("locale") === "de" ? "de" : "tr";
  const jar = await cookies();
  jar.set("rota_locale", locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(safeInternalPath(formData.get("next")));
}
