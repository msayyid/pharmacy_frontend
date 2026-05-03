import { NextResponse, type NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"

import { defaultLocale, locales } from "@/i18n/config"

// Composed middleware: next-intl locale resolution + customer auth gate.
//
// Phase 4 wired next-intl alone for `/` → `/<locale>` redirects + cookie
// persistence. Phase 5 layers the customer auth gate on top per the Phase 5
// plan D8: hard-gated paths (`/[locale]/account/*`, `/[locale]/orders/*`,
// `/[locale]/me/*`) require the `nookat_refresh` HttpOnly cookie set by
// `/api/auth/set-tokens` after a successful OTP verify.
//
// Composition order:
//   1. Run next-intl's middleware to get the locale-rewritten response.
//   2. If next-intl is redirecting (e.g. `/account` → `/ru/account`), let it.
//      The auth gate fires on the next request when the locale is settled.
//   3. Otherwise, check the path against HARD_GATED. If matched and no
//      refresh cookie present, redirect to `/[locale]/auth/otp?return=<path>`.
//
// `createMiddleware` returns a synchronous `(req) => NextResponse` per the
// next-intl 4.11 type definition (verified at sub-phase 5C). No async
// wrapping needed.
//
// Multi-tab caveat (DECISION_LOG R-E, deferred to Phase 11): the gate only
// checks cookie PRESENCE — it can't know if the refresh `jti` was rotated by
// a sibling tab. The user might pass the gate, then have their next API
// call 401-then-clear-store. Single-tab is the supported MVP scenario.

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
})

const REFRESH_COOKIE = "nookat_refresh"

const HARD_GATED: ReadonlyArray<RegExp> = [
  /^\/(?:ru|ky|en)\/account(?:\/|$)/,
  /^\/(?:ru|ky|en)\/orders(?:\/|$)/,
  /^\/(?:ru|ky|en)\/me(?:\/|$)/,
]

function isHardGated(pathname: string): boolean {
  return HARD_GATED.some((pattern) => pattern.test(pathname))
}

function extractLocale(pathname: string): string {
  const match = pathname.match(/^\/(ru|ky|en)\b/)
  return match?.[1] ?? defaultLocale
}

export default function middleware(request: NextRequest): NextResponse {
  const intlResponse = intlMiddleware(request)

  // 3xx → next-intl is redirecting (locale rewrite); pass through. The auth
  // gate runs on the next request after locale settles.
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse
  }

  const pathname = request.nextUrl.pathname
  if (isHardGated(pathname)) {
    const refresh = request.cookies.get(REFRESH_COOKIE)
    if (!refresh) {
      const locale = extractLocale(pathname)
      const loginUrl = new URL(`/${locale}/auth/otp`, request.url)
      // The OTP page is responsible for sanitizing this `return` param
      // (Phase 5D ships lib/auth/return-url.ts; absent that, the OTP page
      // falls back to /[locale]/account on any sanitization failure).
      loginUrl.searchParams.set("return", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return intlResponse
}

export const config = {
  matcher: ["/((?!api|_next|_static|.*\\..*|favicon.ico).*)"],
}
