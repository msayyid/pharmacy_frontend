import type { Locale } from "@/i18n/config"
import { formatPrice } from "@/lib/format/price"
import { cn } from "@/lib/utils"

// DESIGN §11.3 + §5.4 — PriceTag
// Locale-aware price with optional compare-at (struck-through original) and
// "сом"/"KGS" suffix. Tabular nums always (`tabular-nums`). The compare-at
// sits BEFORE the current price in --color-ink-500 with strikethrough; the
// current price is --color-ink-900 bold. Never red strikethrough.
//
// Phase 4: the inline `Intl.NumberFormat` call has been replaced with
// `formatPrice` from `lib/format/price.ts` — the canonical locale-aware
// money formatter. PriceTag is now a thin presentational wrapper around it.

export interface PriceTagProps {
  price: number
  compareAt?: number
  currency?: "KGS"
  locale?: Locale
  className?: string
}

export function PriceTag({
  price,
  compareAt,
  currency = "KGS",
  locale = "ru",
  className,
}: PriceTagProps) {
  const showCompare = typeof compareAt === "number" && compareAt > price

  return (
    <span
      data-slot="price-tag"
      className={cn("inline-flex items-baseline gap-2 tabular-nums", className)}
    >
      {showCompare ? (
        <span className="text-ink-500 line-through">
          {formatPrice(compareAt, locale, { currency })}
        </span>
      ) : null}
      <span className="text-ink-900 font-semibold">{formatPrice(price, locale, { currency })}</span>
    </span>
  )
}
