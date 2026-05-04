"use client"

import { PackageIcon, PhoneIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import * as React from "react"

import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { OrderListPagination } from "@/components/order/OrderListPagination"
import { OrderListRow } from "@/components/order/OrderListRow"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Locale } from "@/i18n/config"
import { ApiError } from "@/lib/api/errors"
import { BRAND } from "@/lib/brand"
import { formatPhoneDisplay } from "@/lib/format/phone"
import { useOrderList } from "@/lib/orders/queries"

// /[locale]/orders — paginated order history (DESIGN §12.10).
//
// Hard-gated by middleware (Phase 5 D4): /[locale]/orders/* requires
// the nookat_refresh cookie or redirects to /auth/otp?return=…
//
// OP-13 contract: useOrderList throws on missing data → consumer
// renders <ErrorState>. Empty list (items.length === 0) is a real
// empty-state, not a fetch failure — clearly distinguished.
//
// Page state lives in component state (not the URL). The list is
// auth-gated and personal; no SEO need to crawl the URL with ?page,
// and no need to share specific pages of orders. Keeping page in
// state simplifies invalidation (cancel / reorder bumps stay on
// page 1).

const PAGE_SIZE = 24

const PHONE_HREF = `tel:${BRAND.supportPhone.replace(/\s/g, "")}`

export default function OrdersPage() {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const [page, setPage] = React.useState(1)
  const orderListQuery = useOrderList({ page, pageSize: PAGE_SIZE })

  const totalCount = orderListQuery.data?.total != null ? orderListQuery.data.total : 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  if (orderListQuery.isPending) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
        <h1 className="text-h1 text-ink-900 font-semibold">{t("order.list.title")}</h1>
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-24 w-full rounded-lg" />
            </li>
          ))}
        </ul>
      </main>
    )
  }

  if (orderListQuery.error) {
    const code =
      orderListQuery.error instanceof ApiError ? orderListQuery.error.code : "unknown_error"
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
        <h1 className="text-h1 text-ink-900 font-semibold">{t("order.list.title")}</h1>
        <ErrorState
          title={t("error.generic")}
          body={t("error.network")}
          code={code}
          cta={
            <div className="flex flex-col items-center gap-3">
              <Button variant="outline" onClick={() => orderListQuery.refetch()}>
                {t("common.retry")}
              </Button>
              <a
                href={PHONE_HREF}
                className="text-body-sm text-primary inline-flex items-center gap-2 underline-offset-2 hover:underline"
              >
                <PhoneIcon aria-hidden="true" className="size-4" />
                <span className="tabular-nums">{formatPhoneDisplay(BRAND.supportPhone)}</span>
              </a>
            </div>
          }
        />
      </main>
    )
  }

  const items = orderListQuery.data?.items ?? []

  if (items.length === 0) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16 md:px-6 md:py-20">
        <EmptyState
          icon={PackageIcon}
          title={t("order.list.empty.title")}
          body={t("order.list.empty.body")}
          cta={
            <Button asChild>
              <Link href={`/${locale}/categories`}>{t("order.list.empty.cta")}</Link>
            </Button>
          }
        />
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
      <h1 className="text-h1 text-ink-900 font-semibold">{t("order.list.title")}</h1>

      <ul className="flex flex-col gap-3">
        {items.map((order) => (
          <li key={order.id}>
            <OrderListRow order={order} locale={locale} />
          </li>
        ))}
      </ul>

      <OrderListPagination currentPage={page} totalPages={totalPages} onChange={setPage} />
    </main>
  )
}
