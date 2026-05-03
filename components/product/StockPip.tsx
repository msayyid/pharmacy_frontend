import { cn } from "@/lib/utils"

// DESIGN §11.3 — StockPip
// Colored dot + label that shows in-stock / out-of-stock state. Used on
// product cards and PDP. Color comes from the pharmacy-domain tokens
// --color-stock-in / --color-stock-out (see globals.css @theme).
//
// `label` is REQUIRED so the i18n discipline holds — the consumer (typically
// a page using next-intl's t()) provides the localized string. There is no
// default fallback because hardcoded RU strings violate `CLAUDE.md > Hard
// prohibitions #3 (never hardcode user-visible strings)`.
//
// Phase 6+ wires this into ProductCard / PDP with t("product.in_stock") /
// t("product.unavailable").

export interface StockPipProps {
  inStock: boolean
  label: string
  className?: string
}

export function StockPip({ inStock, label, className }: StockPipProps) {
  return (
    <span
      data-slot="stock-pip"
      data-state={inStock ? "in-stock" : "out-of-stock"}
      className={cn("text-body-sm inline-flex items-center gap-1.5", className)}
    >
      <span
        aria-hidden="true"
        className={cn("rounded-pill inline-block size-2", inStock ? "bg-stock-in" : "bg-stock-out")}
      />
      <span className={inStock ? "text-stock-in" : "text-stock-out"}>{label}</span>
    </span>
  )
}
