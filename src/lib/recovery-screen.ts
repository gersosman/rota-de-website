export const RECOVERY_COOKIE = "rota_recovery";
export const RECOVERY_COOKIE_PATH = "/admin/mfa";

export function recoveryCookieOptions(secure: boolean) {
  return {
    httpOnly: true as const,
    secure,
    sameSite: "lax" as const,
    path: RECOVERY_COOKIE_PATH,
    maxAge: 300,
  };
}

export function recoveryCodesFromCookie(value: string | null | undefined): string[] | null {
  if (!value) return null;
  const codes = value.split(",").map((item) => item.trim()).filter(Boolean);
  return codes.length > 0 ? codes : null;
}

export function mfaScreen(cookieValue: string | null | undefined): "recovery" | "challenge" {
  return recoveryCodesFromCookie(cookieValue) ? "recovery" : "challenge";
}

export function mayClearRecoveryCookie(input: { confirmed: boolean; mfaEnabled: boolean; mfaPassed: boolean }): boolean {
  return input.confirmed && input.mfaEnabled && input.mfaPassed;
}
