"use client"

import { AlertTriangleIcon, TrashIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

import { ProductImage } from "@/components/product/ProductImage"
import { QuantityStepper } from "@/components/cart/QuantityStepper"
import { useRemoveCartItem, useUpdateCartItem } from "@/lib/cart/mutations"
import type { CartItemRead } from "@/lib/api/types"
import type { Locale } from "@/i18n/config"
import { formatPrice } from "@/lib/format/price"
import { cn } from "@/lib/utils"

// CartLine — DESIGN §12.7 line item shape. Renders one CartItemRead with:
//   - thumbnail (or brand-pill fallback via ProductImage)
//   - product name (linked to PDP) + dosage form
//   - PriceTag with snapshot+current diff (price-changed banner above)
//   - QuantityStepper (debounced PATCH via useUpdateCartItem)
//   - Remove button (optimistic DELETE via useRemoveCartItem)
//   - OOS banner above the line when is_in_stock === false
//   - Price-changed banner above the line when current_price differs
//     from price_snapshot
//
// Per Phase 8 plan D5: OOS UX is a red banner + "Удалить" button. Suggested
// alternatives are deferred to Phase 11 (no real algorithm without admin
// Phase A1+ data).
//
// Per Phase 8 plan D6: price-changed UX is a yellow info strip with "Цена
// изменилась: <old> → <new>" + "Обновить цену" button. The action is a
// PATCH with the same quantity, which the backend interprets as a price
// snapshot refresh.
//
// Nullable fields (per Phase 8 plan R-E): product_name, thumbnail_url,
// current_price, is_in_stock, line_total may be null. Render gracefully:
// null is_in_stock = treat as in-stock (don't false-flag); null
// product_name = "Товар недоступен" fallback; null current_price = no
// price-change diff possible.

export interface CartLineProps {
  item: CartItemRead
  locale: Locale
  className?: string
}

export function CartLine({ item, locale, className }: CartLineProps) {
  const t = useTranslations()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()

  const productName = item.product_name ?? t("product.unavailable")
  const productHref = item.product_slug ? `/${locale}/products/${item.product_slug}` : null

  const snapshotPrice = Number(item.price_snapshot)
  const currentPrice =
    item.current_price !== null && item.current_price !== undefined
      ? Number(item.current_price)
      : null
  const priceChanged = currentPrice !== null && currentPrice !== snapshotPrice

  // Treat null is_in_stock as in-stock (don't false-flag OOS).
  const isOos = item.is_in_stock === false

  const lineTotal =
    item.line_total !== null && item.line_total !== undefined
      ? Number(item.line_total)
      : snapshotPrice * item.quantity

  return (
    <article
      data-slot="cart-line"
      data-stock={isOos ? "out-of-stock" : "in-stock"}
      data-price-changed={priceChanged ? "true" : "false"}
      className={cn(
        "border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-3",
        className,
      )}
    >
      {isOos ? (
        <div
          role="alert"
          className={cn(
            "flex items-center justify-between gap-3 rounded-md px-3 py-2",
            "bg-danger-50 text-danger-700 text-body-sm",
          )}
        >
          <span className="flex items-center gap-2">
            <AlertTriangleIcon aria-hidden="true" className="size-4 flex-none" />
            {t("cart.out_of_stock")}
          </span>
          <button
            type="button"
            onClick={() => removeItem.mutate({ itemId: item.id })}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium",
              "text-danger-700 hover:bg-danger-100",
              "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
            )}
          >
            {t("cart.line.remove")}
          </button>
        </div>
      ) : null}

      {priceChanged && currentPrice !== null ? (
        <div
          role="status"
          className={cn(
            "flex items-center justify-between gap-3 rounded-md px-3 py-2",
            "bg-warning-50 text-warning-700 text-body-sm",
          )}
        >
          <span>
            {t("cart.price_changed")}:{" "}
            <span className="line-through">{formatPrice(snapshotPrice, locale)}</span> →{" "}
            <span className="font-semibold">{formatPrice(currentPrice, locale)}</span>
          </span>
          <button
            type="button"
            onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity })}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium",
              "text-warning-700 hover:bg-warning-100",
              "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
            )}
          >
            {t("cart.line.price_changed_action")}
          </button>
        </div>
      ) : null}

      <div className="flex gap-3">
        <div className="flex-none">
          <ProductImage src={item.thumbnail_url} alt={productName} className="size-20" />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {productHref ? (
            <Link
              href={productHref}
              className={cn(
                "text-body-sm text-ink-900 hover:text-brand-600 font-semibold",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              {productName}
            </Link>
          ) : (
            <span className="text-body-sm text-ink-900 font-semibold">{productName}</span>
          )}
          <span className="text-caption text-ink-500 tabular-nums">
            {formatPrice(snapshotPrice, locale)}
          </span>
        </div>
        <div className="flex flex-col items-end justify-between gap-2">
          <span className="text-body-sm text-ink-900 font-semibold tabular-nums">
            {formatPrice(lineTotal, locale)}
          </span>
          <div className="flex items-center gap-2">
            <QuantityStepper
              value={item.quantity}
              onChange={(quantity) => updateItem.mutate({ itemId: item.id, quantity })}
              disabled={isOos}
            />
            <button
              type="button"
              onClick={() => removeItem.mutate({ itemId: item.id })}
              aria-label={t("cart.line.remove")}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-md",
                "text-ink-500 hover:bg-ink-50 hover:text-danger-600",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              <TrashIcon aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
