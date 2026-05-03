import { format } from "date-fns"
import { enUS, ru } from "date-fns/locale"

import type { Locale } from "@/i18n/config"

// Locale-aware date formatter built on date-fns.
//
// Phase 4 D11 — date-fns has no `ky` locale. KY shares RU's `DD.MM.YYYY`
// shape per DESIGN §18.2, so we reuse the RU date-fns locale for KY. The
// visible difference is zero; only month / weekday names from `format`
// patterns that include those tokens would diverge — and we don't use
// such patterns at MVP.
const localeMap: Record<Locale, typeof ru> = {
  ru,
  ky: ru,
  en: enUS,
}

const DEFAULT_PATTERNS: Record<Locale, string> = {
  ru: "dd.MM.yyyy",
  ky: "dd.MM.yyyy",
  en: "dd/MM/yyyy",
}

export function formatDate(date: Date | string, locale: Locale, pattern?: string): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ""
  return format(d, pattern ?? DEFAULT_PATTERNS[locale], { locale: localeMap[locale] })
}
