"use client"

import { useTranslations } from "next-intl"
import * as React from "react"

import { Button } from "@/components/ui/button"
import type { Locale } from "@/i18n/config"
import type { PriceConflict, StockConflict } from "@/lib/api/types"
import { formatPrice } from "@/lib/format/price"
import { cn } from "@/lib/utils"

// ConflictBanner — surfaces stock + price conflicts returned by
// POST /api/v1/checkout/quote (200 with non-empty stock_conflicts /
// price_conflicts arrays per backend's structured-conflict pattern) OR
// returned with HTTP 409 from POST /api/v1/checkout/place when the cart
// drifts between quote and place.
//
// Per CLAUDE.md OP-13 + Phase 9 plan vigilance directive #1: 200-with-
// conflicts is structured success — quote does not throw; this banner
// renders inline. The 409 path is owned by usePlaceOrder's onError
// (CheckoutForm orchestrator); when triggered, the orchestrator
// refetches the quote (so conflicts re-surface here) and wires the
// "Edit cart" CTA to /cart.
//
// DESIGN §13.7: warning-tone container, plain-language messaging,
// always-actionable (Edit cart button never hides — the customer must
// be able to escape the conflict surface).

export interface ConflictBannerProps {
  stockConflicts: ReadonlyArray<StockConflict>
  priceConflicts: ReadonlyArray<PriceConflict>
  cartItemNames: ReadonlyMap<number, string>
  locale: Locale
  onEditCart: () => void
  className?: string
}

export function ConflictBanner({
  stockConflicts,
  priceConflicts,
  cartItemNames,
  locale,
  onEditCart,
  className,
}: ConflictBannerProps) {
  const t = useTranslations()
  const hasConflicts = stockConflicts.length > 0 || priceConflicts.length > 0
  if (!hasConflicts) return null

  return (
    <div
      role="alert"
      data-slot="checkout-conflict-banner"
      className={cn(
        "border-warning-500/30 bg-warning-100 flex flex-col gap-3 rounded-lg border p-4",
        className,
      )}
    >
      <p className="text-body text-ink-900 font-semibold">{t("error.checkout_conflict")}</p>
      <ul className="text-body-sm text-ink-700 flex flex-col gap-1.5">
        {stockConflicts.map((conflict) => {
          const name = cartItemNames.get(conflict.cart_item_id) ?? "—"
          return (
            <li key={`stock-${conflict.cart_item_id}`} className="flex flex-col gap-0.5">
              <span className="text-ink-900 font-medium">{name}</span>
              <span className="tabular-nums">
                {t("checkout.conflict.stock_line", {
                  requested: conflict.requested_quantity,
                  available: conflict.available_quantity,
                })}
              </span>
            </li>
          )
        })}
        {priceConflicts.map((conflict) => {
          const name = cartItemNames.get(conflict.cart_item_id) ?? "—"
          return (
            <li key={`price-${conflict.cart_item_id}`} className="flex flex-col gap-0.5">
              <span className="text-ink-900 font-medium">{name}</span>
              <span>
                <span>{t("cart.price_changed")}: </span>
                <span className="tabular-nums">
                  {formatPrice(Number(conflict.snapshot_price), locale)}
                  {" → "}
                  {formatPrice(Number(conflict.current_price), locale)}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <div className="flex justify-start">
        <Button type="button" variant="secondary" onClick={onEditCart}>
          {t("cart.go_to_cart")}
        </Button>
      </div>
    </div>
  )
}
