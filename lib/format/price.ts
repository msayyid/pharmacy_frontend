import type { Locale } from "@/i18n/config"

// Locale-aware money formatter. Source rules (DESIGN §5.4 + §18.2):
//   ru / ky → "1 250 сом" (thin space U+2009 thousands, comma decimal,
//             lowercase сом suffix with thin space before)
//   en      → "1,250 KGS" (comma thousands, period decimal, KGS suffix)
//
// `Intl.NumberFormat("ru-RU")` emits NBSP (U+00A0) between thousands; per
// DESIGN §18.2 we want the narrower thin space, so swap. The space between
// the amount and the suffix is also thin per DESIGN §5.4.

const THIN_SPACE = " "
const NBSP = " "

export interface FormatPriceOptions {
  currency?: "KGS"
  /** Pass `true` to keep trailing 2 decimals even on whole numbers. */
  showDecimals?: boolean
}

export function formatPrice(
  value: number | string,
  locale: Locale,
  options: FormatPriceOptions = {},
): string {
  const n = typeof value === "string" ? Number(value) : value
  if (!Number.isFinite(n)) return ""

  const currency = options.currency ?? "KGS"
  const fractionDigits = options.showDecimals ? 2 : 0
  const intlOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  }

  if (locale === "en") {
    const formatted = new Intl.NumberFormat("en-US", intlOptions).format(n)
    return `${formatted} ${currency}`
  }

  // ru / ky
  const formatted = new Intl.NumberFormat("ru-RU", intlOptions)
    .format(n)
    .split(NBSP)
    .join(THIN_SPACE)
  return `${formatted}${THIN_SPACE}сом`
}
