"use client"

import { CircleCheckIcon, PhoneIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import * as React from "react"

import { CancelOrderButton } from "@/components/order/CancelOrderDialog"
import { DeliveryBlock } from "@/components/order/DeliveryBlock"
import { OrderItemsBlock } from "@/components/order/OrderItemsBlock"
import { OrderNumber } from "@/components/order/OrderNumber"
import { ReorderButton } from "@/components/order/ReorderButton"
import { StatusPip } from "@/components/order/StatusPip"
import { StatusTimeline } from "@/components/order/StatusTimeline"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Locale } from "@/i18n/config"
import type { OrderRead } from "@/lib/api/types"
import { BRAND } from "@/lib/brand"
import { formatDate } from "@/lib/format/date"
import { formatPhoneDisplay } from "@/lib/format/phone"
import { isCustomerCancellable, isTerminal } from "@/lib/orders/lifecycle"
import { useOrder } from "@/lib/orders/queries"

// /[locale]/orders/[orderNumber] — confirmation + status detail surface
// (DESIGN §12.9 + §12.10 timeline). Phase 9E shipped this page as the
// confirmation landing for /place; Phase 10 layers in:
//   - useOrder() with Q-12 polling (60s while non-terminal, off in
//     background tabs, off when terminal).
//   - <StatusTimeline> for the order's progress (delivery / pickup
//     sequences + terminal interrupt collapse).
//   - <DeliveryBlock> for recipient + address + customer notes +
//     cancel reason.
//   - <OrderItemsBlock> for snapshot-immutable line rendering.
//
// The 9E success-framing fallback (DECISION_LOG D9) STAYS: when the
// initial GET races the backend's commit and times out across 3
// attempts, render a calm "Order accepted; details in a few minutes;
// we'll call you within 10 min" — never an error page. The /place
// 201 is the source of truth.
//
// Sacred-invariant #5 (--text-mono PH- prefix) centralized in
// <OrderNumber>. Sacred-invariant #4 (support phone in every error
// state) lives in <SupportFooter>. Sacred-invariant #8 (no PII
// logged): we display recipient_*/delivery_address but never trace().

interface OrderDetailPageProps {
  params: Promise<{ locale: string; orderNumber: string }>
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderNumber } = React.use(params)
  const locale = useLocale() as Locale
  const orderQuery = useOrder(orderNumber)
  const isPending = orderQuery.isPending || orderQuery.isFetching

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
      <PageHeader orderNumber={orderNumber} order={orderQuery.data} locale={locale} />

      {orderQuery.data ? (
        <>
          <StatusTimeline order={orderQuery.data} locale={locale} />
          <DeliveryBlock order={orderQuery.data} />
          <OrderItemsBlock order={orderQuery.data} locale={locale} />
          <OrderActions order={orderQuery.data} locale={locale} />
        </>
      ) : isPending ? (
        <>
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </>
      ) : (
        <FallbackBlock locale={locale} />
      )}

      <SupportFooter />
    </main>
  )
}

function PageHeader({
  orderNumber,
  order,
  locale,
}: {
  orderNumber: string
  order: OrderRead | undefined
  locale: Locale
}) {
  const t = useTranslations()
  return (
    <header className="flex flex-col items-start gap-3">
      <CircleCheckIcon className="text-success-500 size-12" aria-hidden="true" />
      <h1 className="text-h2 text-ink-900 font-semibold">
        {t("checkout.confirmation.heading", { orderNumber })}
      </h1>
      <div className="flex flex-wrap items-center gap-3">
        <OrderNumber value={orderNumber} size="sm" />
        {order ? <StatusPip status={order.status} /> : null}
      </div>
      {order ? (
        <p className="text-caption text-ink-500 tabular-nums">
          {t("order.detail.placed_at_label")}: {formatDate(order.placed_at, locale)}
        </p>
      ) : null}
      {!order ? (
        <p className="text-body text-ink-700">{t("checkout.confirmation.contact_soon")}</p>
      ) : null}
    </header>
  )
}

function OrderActions({ order, locale }: { order: OrderRead; locale: Locale }) {
  // CTAs gated by lifecycle predicates. Cancel: pending | confirmed
  // (backend _CUSTOMER_CANCELLABLE). Reorder: terminal states
  // (delivered | cancelled | refunded) — the J-02 "buy this again"
  // path; rendering during in-flight pickup/delivery would compete
  // with the active order's intent.
  const showCancel = isCustomerCancellable(order.status)
  const showReorder = isTerminal(order.status)
  if (!showCancel && !showReorder) return null
  return (
    <section data-slot="order-actions" className="flex flex-wrap items-center justify-end gap-3">
      {showCancel ? <CancelOrderButton order={order} /> : null}
      {showReorder ? <ReorderButton order={order} locale={locale} /> : null}
    </section>
  )
}

function FallbackBlock({ locale }: { locale: Locale }) {
  // 9E success-framing fallback per DECISION_LOG D9. The order has been
  // placed (201 from /place was the source of truth); a transient read
  // failure is purely a UX concern.
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
  // Sacred-invariant #4 — customer support phone always one tap away.
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
