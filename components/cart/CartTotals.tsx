import { getTranslations } from "next-intl/server"

import type { Locale } from "@/i18n/config"
import type { CartTotalsRead } from "@/lib/api/types"
import { formatPrice } from "@/lib/format/price"
import { cn } from "@/lib/utils"

// CartTotals — DESIGN §12.7 sticky totals card. Renders subtotal +
// (when non-null) delivery_fee + discount + total, plus a free-delivery
// progress hint when the backend exposes free_delivery_remaining.
//
// Nullable handling per Phase 8 research:
//   - delivery_fee + total are null pre-checkout (no delivery method
//     selected). Cart page hides the delivery row + shows the subtotal
//     as the headline; the totals settle at quote time (Phase 9).
//   - free_delivery_threshold + free_delivery_remaining: when both
//     present and remaining > 0, render the progress strip; when
//     remaining is 0 / null, hide.
//
// RSC — pure data renderer; uses next-intl/server's getTranslations
// because the consumer is the /cart RSC page (CartDrawer's drawer-side
// render passes via a client wrapper that mirrors the same data).

export interface CartTotalsProps {
  totals: CartTotalsRead
  locale: Locale
  className?: string
}

export async function CartTotals({ totals, locale, className }: CartTotalsProps) {
  const t = await getTranslations()
  const subtotal = Number(totals.subtotal)
  const deliveryFee =
    totals.delivery_fee !== null && totals.delivery_fee !== undefined
      ? Number(totals.delivery_fee)
      : null
  const discount = Number(totals.discount_amount)
  const total = totals.total !== null && totals.total !== undefined ? Number(totals.total) : null
  const freeDeliveryRemaining =
    totals.free_delivery_remaining !== null && totals.free_delivery_remaining !== undefined
      ? Number(totals.free_delivery_remaining)
      : null
  const showFreeDelivery = freeDeliveryRemaining !== null && freeDeliveryRemaining > 0

  return (
    <div
      data-slot="cart-totals"
      className={cn(
        "border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-4",
        className,
      )}
    >
      {showFreeDelivery ? (
        <p data-slot="free-delivery-progress" className="text-body-sm text-ink-600">
          {t("checkout.free_delivery_hint", { amount: freeDeliveryRemaining })}
        </p>
      ) : null}
      <dl className="text-body-sm flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-700">{t("checkout.totals.subtotal")}</dt>
          <dd className="text-ink-900 font-medium tabular-nums">{formatPrice(subtotal, locale)}</dd>
        </div>
        {discount > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-700">{t("checkout.totals.discount")}</dt>
            <dd className="text-success-700 font-medium tabular-nums">
              −{formatPrice(discount, locale)}
            </dd>
          </div>
        ) : null}
        {deliveryFee !== null ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-700">{t("checkout.totals.delivery")}</dt>
            <dd className="text-ink-900 font-medium tabular-nums">
              {formatPrice(deliveryFee, locale)}
            </dd>
          </div>
        ) : null}
        {total !== null ? (
          <div className="border-ink-100 flex items-center justify-between gap-3 border-t pt-2">
            <dt className="text-body text-ink-900 font-semibold">{t("checkout.totals.total")}</dt>
            <dd className="text-body text-ink-900 font-semibold tabular-nums">
              {formatPrice(total, locale)}
            </dd>
          </div>
        ) : (
          <p className="text-caption text-ink-500">{t("checkout.totals.delivery")}: —</p>
        )}
      </dl>
    </div>
  )
}
