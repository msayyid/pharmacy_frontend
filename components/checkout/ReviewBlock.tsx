"use client"

import { useTranslations } from "next-intl"
import Image from "next/image"
import * as React from "react"

import type { Locale } from "@/i18n/config"
import type { CartItemRead, CheckoutQuote } from "@/lib/api/types"
import { formatPrice } from "@/lib/format/price"
import { cn } from "@/lib/utils"

// ReviewBlock — DESIGN §12.8 sticky right-rail summary.
//
// Renders cart line snapshots (image + name + qty) and the totals
// returned by the live quote (subtotal / discount / delivery_fee /
// total). On desktop, sticks to the right column at md:; on mobile
// it stacks below the form.
//
// Quote loading: we accept an `isQuotePending` flag from the consumer
// so totals show a skeleton row while a refetch is in flight (e.g.
// after delivery_method change). Items are taken from the cart hook
// (stable until the user navigates back to /cart), so they never
// flicker on quote refetch.

export interface ReviewBlockProps {
  items: ReadonlyArray<CartItemRead>
  quote: CheckoutQuote | undefined
  locale: Locale
  isQuotePending: boolean
  className?: string
}

export function ReviewBlock({ items, quote, locale, isQuotePending, className }: ReviewBlockProps) {
  const t = useTranslations()

  return (
    <aside
      data-slot="checkout-review"
      aria-labelledby="checkout-review-heading"
      className={cn(
        "border-ink-100 bg-surface-card flex flex-col gap-4 rounded-lg border p-4",
        className,
      )}
    >
      <h2 id="checkout-review-heading" className="text-h4 text-ink-900 font-semibold">
        {t("checkout.section.review")}
      </h2>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <div className="bg-ink-50 relative size-12 shrink-0 overflow-hidden rounded-md">
              {item.thumbnail_url ? (
                <Image src={item.thumbnail_url} alt="" fill sizes="48px" className="object-cover" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-body-sm text-ink-900 line-clamp-2">{item.product_name ?? "—"}</p>
              <p className="text-caption text-ink-500 tabular-nums">
                {item.quantity} × {formatPrice(Number(item.price_snapshot), locale)}
              </p>
            </div>
            {item.line_total ? (
              <p className="text-body-sm text-ink-900 tabular-nums">
                {formatPrice(Number(item.line_total), locale)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <dl className="border-ink-100 text-body-sm flex flex-col gap-2 border-t pt-3">
        <Row
          label={t("checkout.totals.subtotal")}
          value={quote ? formatPrice(Number(quote.subtotal), locale) : "—"}
          loading={isQuotePending && !quote}
        />
        {quote && Number(quote.discount_amount) > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-700">{t("checkout.totals.discount")}</dt>
            <dd className="text-success-700 font-medium tabular-nums">
              −{formatPrice(Number(quote.discount_amount), locale)}
            </dd>
          </div>
        ) : null}
        <Row
          label={t("checkout.totals.delivery")}
          value={quote ? formatPrice(Number(quote.delivery_fee), locale) : "—"}
          loading={isQuotePending && !quote}
        />
        <div className="border-ink-100 flex items-center justify-between gap-3 border-t pt-2">
          <dt className="text-body text-ink-900 font-semibold">{t("checkout.totals.total")}</dt>
          <dd
            className={cn(
              "text-body text-ink-900 font-semibold tabular-nums",
              isQuotePending && "opacity-50",
            )}
          >
            {quote ? formatPrice(Number(quote.total), locale) : "—"}
          </dd>
        </div>
      </dl>
    </aside>
  )
}

interface RowProps {
  label: string
  value: string
  loading?: boolean
}

function Row({ label, value, loading }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-700">{label}</dt>
      <dd className={cn("text-ink-900 font-medium tabular-nums", loading && "opacity-50")}>
        {value}
      </dd>
    </div>
  )
}
