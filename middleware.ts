import createMiddleware from "next-intl/middleware"

import { defaultLocale, locales } from "@/i18n/config"

// next-intl locale middleware: rewrites `/` → `/ru`, parses `/ky/...` etc.,
// and persists the choice in the `NEXT_LOCALE` cookie (per Q-11 in
// MASTER_PLAN.md and FRONTEND_BLUEPRINT §13.1).
//
// `localePrefix: "always"` enforces D1 (every URL is locale-prefixed; SEO-
// explicit, simpler resolution).
//
// `localeDetection: true` consults Accept-Language for the FIRST visit only;
// after that, the cookie wins. URL prefix always wins over both.
//
// The matcher excludes route handlers (/api), Next internals (/_next),
// static files (/.something), and favicon — those don't need locale rewrites.

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
})

export const config = {
  matcher: ["/((?!api|_next|_static|.*\\..*|favicon.ico).*)"],
}
