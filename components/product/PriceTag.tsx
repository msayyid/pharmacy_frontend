import { cn } from "@/lib/utils"

// DESIGN §11.3 + §5.4 — PriceTag
// Locale-aware price with optional compare-at (struck-through original) and
// "сом"/"KGS" suffix. Tabular nums always (`tabular-nums`). The compare-at
// sits BEFORE the current price in --color-ink-500 with strikethrough; the
// current price is --color-ink-900 bold. Never red strikethrough.
//
// This is a Phase-2 skeleton: it does its own minimal Intl.NumberFormat call
// so the kitchen-sink page renders sensibly. Phase 4 will replace the inline
// formatter with `formatPrice(price, locale)` from `lib/format/price.ts`,
// which the i18n layer reads.
//
// CLAUDE.md > Domain reality checks > Locale-aware money:
//   ru/ky → "1 250 сом" (thin space U+2009, lowercase сом suffix)
//   en    → "1,250 KGS" (comma thousands, KGS suffix)

export interface PriceTagProps {
  price: number
  compareAt?: number
  currency?: "KGS"
  locale?: "ru" | "ky" | "en"
  className?: string
}

const THIN_SPACE = " "
const NBSP = " "

function formatAmount(amount: number, locale: "ru" | "ky" | "en"): string {
  if (locale === "en") {
    return new Intl.NumberFormat("en-US").format(amount)
  }
  // ru/ky: Intl emits NBSP between thousands; swap to thin space per DESIGN §5.4.
  return new Intl.NumberFormat("ru-RU").format(amount).split(NBSP).join(THIN_SPACE)
}

export function PriceTag({
  price,
  compareAt,
  currency = "KGS",
  locale = "ru",
  className,
}: PriceTagProps) {
  const suffix = locale === "en" ? currency : "сом"
  const showCompare = typeof compareAt === "number" && compareAt > price

  return (
    <span
      data-slot="price-tag"
      className={cn("inline-flex items-baseline gap-2 tabular-nums", className)}
    >
      {showCompare ? (
        <span className="text-ink-500 line-through">
          {formatAmount(compareAt, locale)}
          {THIN_SPACE}
          {suffix}
        </span>
      ) : null}
      <span className="text-ink-900 font-semibold">
        {formatAmount(price, locale)}
        {THIN_SPACE}
        {suffix}
      </span>
    </span>
  )
}
