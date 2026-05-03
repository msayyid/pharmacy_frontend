import { getRequestConfig } from "next-intl/server"
import { hasLocale } from "next-intl"

import { defaultLocale, locales } from "./config"

// next-intl request resolver. Runs per request on the server side; reads the
// `[locale]` URL segment (set by middleware), falls back to the default if
// the requested value is missing or unrecognized.
//
// The dynamic import path matches the file shape (`messages/<locale>.json`)
// chosen in the Phase 4 plan (D2: flat dotted keys, mirroring the backend's
// `app/i18n/<lang>.json` shape exactly so a backend error code passes
// straight through to `t("error.<code>")` without any path translation).

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(locales, requested) ? requested : defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
