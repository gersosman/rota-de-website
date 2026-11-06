import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  if (!isDev) {
    response.headers.set("strict-transport-security", "max-age=15552000; includeSubDomains");
  }

  const { pathname } = request.nextUrl;
  const openAdmin = pathname === "/admin/giris" || pathname === "/admin/kurulum";
  if (pathname.startsWith("/admin") && !openAdmin && !request.cookies.get("rota_session")?.value) {
    return NextResponse.redirect(new URL("/admin/giris", request.url));
  }
  return response;
}

export const config = {
  // Keep Next internals, including the dev HMR socket, out of this proxy.
  // In development, React hydration waits on debug chunks delivered over
  // `/_next/hmr`. Rewriting that upgrade as a normal response leaves the page
  // as static HTML and every client interaction dead.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
