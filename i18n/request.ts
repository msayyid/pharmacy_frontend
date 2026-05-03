import { getRequestConfig } from "next-intl/server"
import { hasLocale } from "next-intl"

import { defaultLocale, locales } from "./config"
import { unflattenMessages } from "./unflatten"

// next-intl request resolver. Runs per request on the server side; reads the
// `[locale]` URL segment (set by middleware), falls back to the default if
// the requested value is missing or unrecognized.
//
// The dynamic import path matches the file shape (`messages/<locale>.json`)
// chosen in the Phase 4 plan (D2: flat dotted keys mirroring the backend's
// `app/i18n/<lang>.json` shape exactly so a backend error code passes
// straight through to `t("error.<code>")` without any path translation).
//
// next-intl 4.x treats `.` in t(key) as a path separator, so we unflatten
// the on-disk JSON into a nested object before handing it to next-intl.
// Discovered Phase 5F when Playwright surfaced MISSING_MESSAGE errors on
// the OTP page; see DECISION_LOG > Phase 5 D-bug for context.

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(locales, requested) ? requested : defaultLocale

  const flat = (await import(`../messages/${locale}.json`)).default as Record<string, string>

  return {
    locale,
    timeZone: "Asia/Bishkek",
    messages: unflattenMessages(flat),
  }
})
