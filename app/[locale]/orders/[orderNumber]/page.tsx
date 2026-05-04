"use client"

import { useQuery } from "@tanstack/react-query"
import { CircleCheckIcon, PhoneIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Locale } from "@/i18n/config"
import { apiClient } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import type { OrderRead } from "@/lib/api/types"
import { BRAND } from "@/lib/brand"
import { formatPhoneDisplay } from "@/lib/format/phone"
import { formatPrice } from "@/lib/format/price"
import { cn } from "@/lib/utils"

// /[locale]/orders/[orderNumber] — confirmation surface (DESIGN §12.9).
//
// Per the Phase 9 plan vigilance directive #4: "the GET that fetches
// the order can race the backend's commit; if it 404s once or twice,
// retry up to 3 attempts, and on the 3rd-attempt-failure render a
// success-framing fallback ('Order accepted, details in a few minutes,
// we'll call you within 10 minutes') — NOT an error page". The order
// has been placed (we got 201 on /place, then redirected here); a
// transient read failure is purely a UX concern, never a "your order
// failed" message.
//
// Three render branches:
//   pending  — skeleton with the order number visible (taken from URL,
//              guaranteed)
//   success  — order summary with monospace order number, items snapshot,
//              totals, and customer-support phone tap-to-call
//   fallback — after retries exhausted, a calm success-framed message
//              with a "View my orders" link + support phone
//
// Order-number invariant per CLAUDE.md sacred-invariants #5: --text-mono,
// PH- prefix. The backend already includes the prefix in `order_number`
// per the OrderRead schema (e.g. "PH-2025-12345").

const RETRY_LIMIT = 2 // TanStack Query: 3 attempts total (initial + 2 retries)

interface OrderConfirmationPageProps {
  params: Promise<{ locale: string; orderNumber: string }>
}

export default function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { orderNumber } = React.use(params)
  const t = useTranslations()
  const locale = useLocale() as Locale

  const orderQuery = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: async (): Promise<OrderRead> => {
      const response = await apiClient.GET(
        "/api/v1/me/orders/{order_number}" as never,
        { params: { path: { order_number: orderNumber } } } as never,
      )
      const data = (response as { data?: OrderRead }).data
      if (!data) {
        throw new ApiError({
          code: "order_response_missing_data",
          status: 0,
          context: {},
        })
      }
      return data
    },
    retry: RETRY_LIMIT,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  })

  // Pending = first attempt OR retrying. We don't distinguish here
  // because the user's experience is the same either way: "we're
  // looking up your order".
  const isPending = orderQuery.isPending || orderQuery.isFetching

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col items-start gap-3">
        <CircleCheckIcon className="text-success-500 size-12" aria-hidden="true" />
        <h1 className="text-h2 text-ink-900 font-semibold">
          {t("checkout.confirmation.heading", { orderNumber: orderNumber })}
        </h1>
        <p
          data-slot="order-number"
          className={cn("text-body-sm text-ink-700 font-mono")}
          style={{ fontFamily: "var(--font-mono, ui-monospace)" }}
        >
          {orderNumber}
        </p>
        <p className="text-body text-ink-700">{t("checkout.confirmation.contact_soon")}</p>
      </header>

      {orderQuery.data ? (
        <OrderSummary order={orderQuery.data} locale={locale} />
      ) : isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <FallbackBlock locale={locale} />
      )}

      <SupportFooter />
    </main>
  )
}

function OrderSummary({ order, locale }: { order: OrderRead; locale: Locale }) {
  const t = useTranslations()
  return (
    <section
      data-slot="order-summary"
      aria-labelledby="order-summary-heading"
      className="border-ink-100 bg-surface-card flex flex-col gap-4 rounded-lg border p-4"
    >
      <h2 id="order-summary-heading" className="text-h4 text-ink-900 font-semibold">
        {t("checkout.confirmation.summary_heading")}
      </h2>
      <ul className="flex flex-col gap-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
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
        <Row
          label={t("checkout.totals.subtotal")}
          value={formatPrice(Number(order.subtotal), locale)}
        />
        {Number(order.discount_amount) > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-700">{t("checkout.totals.discount")}</dt>
            <dd className="text-success-700 font-medium tabular-nums">
              −{formatPrice(Number(order.discount_amount), locale)}
            </dd>
          </div>
        ) : null}
        <Row
          label={t("checkout.totals.delivery")}
          value={formatPrice(Number(order.delivery_fee), locale)}
        />
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-700">{label}</dt>
      <dd className="text-ink-900 font-medium tabular-nums">{value}</dd>
    </div>
  )
}

function FallbackBlock({ locale }: { locale: Locale }) {
  const t = useTranslations()
  return (
    <section
      data-slot="order-confirmation-fallback"
      className="border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-4"
    >
      <h2 className="text-h4 text-ink-900 font-semibold">
        {t("checkout.confirmation.fallback_heading")}
      </h2>
      <p className="text-body text-ink-700">{t("checkout.confirmation.fallback_body")}</p>
      <Link href={`/${locale}/orders`}>
        <Button variant="secondary">{t("checkout.confirmation.view_orders")}</Button>
      </Link>
    </section>
  )
}

function SupportFooter() {
  // Customer support phone always one tap away — sacred invariant #4.
  return (
    <footer className="flex items-center gap-2">
      <PhoneIcon className="text-ink-500 size-4" aria-hidden="true" />
      <a
        href={`tel:${BRAND.supportPhone.replace(/\s/g, "")}`}
        className="text-body-sm text-primary tabular-nums underline-offset-2 hover:underline"
      >
        {formatPhoneDisplay(BRAND.supportPhone)}
      </a>
    </footer>
  )
}
