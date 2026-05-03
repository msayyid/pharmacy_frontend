import type { Locale } from "@/i18n/config"

// Locale-aware number formatter. Used for quantity, item counts, and any
// non-currency numeric display. Currency lives in `lib/format/price.ts`.
//
// DESIGN §18.2: ru/ky use thin space thousands + comma decimal; en uses
// comma thousands + period decimal. Intl emits NBSP for ru-RU; we swap to
// thin space for visual consistency with PriceTag.

const THIN_SPACE = " "
const NBSP = " "

export function formatNumber(
  value: number | string,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string {
  const n = typeof value === "string" ? Number(value) : value
  if (!Number.isFinite(n)) return ""

  if (locale === "en") {
    return new Intl.NumberFormat("en-US", options).format(n)
  }
  return new Intl.NumberFormat("ru-RU", options).format(n).split(NBSP).join(THIN_SPACE)
}
