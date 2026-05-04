"use client"

import { useTranslations } from "next-intl"

import type { Locale } from "@/i18n/config"
import type { OrderRead } from "@/lib/api/types"
import { formatPrice } from "@/lib/format/price"

// Order items list — displays the snapshot fields verbatim per
// CLAUDE.md > Domain reality > Snapshot immutability:
//
//   "order_items carries snapshot fields (product_name_snapshot,
//    product_sku_snapshot, etc.). The frontend displays whatever the
//    API returns — it's frozen at order time. Don't refetch product
//    detail to override the order line; the snapshot IS the order."
//
// Zero network calls, zero PDP joins. Just renders what the order
// already carries.

interface OrderItemsBlockProps {
  order: OrderRead
  locale: Locale
}

export function OrderItemsBlock({ order, locale }: OrderItemsBlockProps) {
  const t = useTranslations()
  return (
    <section
      data-slot="order-items"
      aria-label={t("checkout.confirmation.summary_heading")}
      className="border-ink-100 bg-surface-card flex flex-col gap-4 rounded-lg border p-4"
    >
      <h2 className="text-h4 text-ink-900 font-semibold">
        {t("checkout.confirmation.summary_heading")}
      </h2>
      <ul className="flex flex-col gap-3">
        {order.items.map((item) => (
          <li key={item.id} data-slot="order-item" className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-body-sm text-ink-900 line-clamp-2">{item.product_name_snapshot}</p>
              <p className="text-caption text-ink-500 tabular-nums">
                {item.quantity} × {formatPrice(Number(item.unit_price), locale)}
              </p>
            </div>
            <p className="text-body-sm text-ink-900 tabular-nums">
              {formatPrice(Number(item.line_total), locale)}
            </p>
          </li>
        ))}
      </ul>
      <dl className="border-ink-100 text-body-sm flex flex-col gap-2 border-t pt-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-700">{t("checkout.totals.subtotal")}</dt>
          <dd className="text-ink-900 font-medium tabular-nums">
            {formatPrice(Number(order.subtotal), locale)}
          </dd>
        </div>
        {Number(order.discount_amount) > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-700">{t("checkout.totals.discount")}</dt>
            <dd className="text-success-700 font-medium tabular-nums">
              −{formatPrice(Number(order.discount_amount), locale)}
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-700">{t("checkout.totals.delivery")}</dt>
          <dd className="text-ink-900 font-medium tabular-nums">
            {formatPrice(Number(order.delivery_fee), locale)}
          </dd>
        </div>
        <div className="border-ink-100 flex items-center justify-between gap-3 border-t pt-2">
          <dt className="text-body text-ink-900 font-semibold">{t("checkout.totals.total")}</dt>
          <dd className="text-body text-ink-900 font-semibold tabular-nums">
            {formatPrice(Number(order.total), locale)}
          </dd>
        </div>
      </dl>
    </section>
  )
}
