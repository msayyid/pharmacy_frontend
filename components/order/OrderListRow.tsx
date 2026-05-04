"use client"

import { ChevronRightIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

import type { Locale } from "@/i18n/config"
import type { OrderListItem } from "@/lib/api/types"
import { formatDate } from "@/lib/format/date"
import { formatPrice } from "@/lib/format/price"
import { cn } from "@/lib/utils"

import { OrderNumber } from "./OrderNumber"
import { StatusPip } from "./StatusPip"

// Single row in /[locale]/orders. Mobile-first stacked layout that
// expands to a horizontal row at md+. Whole row is a <Link> for big
// touch target — DESIGN §11.4 + accessibility (44×44 minimum).

export interface OrderListRowProps {
  order: OrderListItem
  locale: Locale
}

export function OrderListRow({ order, locale }: OrderListRowProps) {
  const t = useTranslations()
  return (
    <Link
      href={`/${locale}/orders/${order.order_number}`}
      data-slot="order-list-row"
      data-status={order.status}
      className={cn(
        "border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-4",
        "hover:border-ink-200 hover:bg-ink-50/50 transition-colors",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        "md:flex-row md:items-center md:gap-6",
      )}
      aria-label={`${t("order.list.item.view")} ${order.order_number}`}
    >
      <div className="flex flex-col gap-1 md:min-w-0 md:flex-1">
        <OrderNumber value={order.order_number} size="md" />
        <p className="text-caption text-ink-500">
          {t("order.list.item.placed_label")}: {formatDate(order.placed_at, locale)}
        </p>
      </div>

      <div className="flex flex-col items-start gap-1 md:items-end">
        <StatusPip status={order.status} />
        <p className="text-body-sm text-ink-900 font-semibold tabular-nums">
          {formatPrice(Number(order.total), locale)}
        </p>
      </div>

      <ChevronRightIcon
        aria-hidden="true"
        className="text-ink-400 hidden size-5 shrink-0 md:block"
      />
    </Link>
  )
}
