"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

// Client-side pagination for /[locale]/orders. Mirrors the visual
// shape of `components/catalog/Pagination.tsx` but consumes
// useTranslations + an onChange callback (vs RSC `<Link>` hrefs)
// because the orders list lives in a Client Component.
//
// 7-button window with first/last + ±2 neighbours + ellipsis when
// there's a gap. Returns null when totalPages ≤ 1.

const PAGE_NEIGHBOURS = 2

function buildPageList(current: number, total: number): Array<number | "gap"> {
  if (total <= 1) return []
  const pages = new Set<number>([1, total, current])
  for (let offset = 1; offset <= PAGE_NEIGHBOURS; offset += 1) {
    if (current - offset >= 1) pages.add(current - offset)
    if (current + offset <= total) pages.add(current + offset)
  }
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const out: Array<number | "gap"> = []
  for (let i = 0; i < sorted.length; i += 1) {
    const value = sorted[i]!
    out.push(value)
    const next = sorted[i + 1]
    if (next !== undefined && next - value > 1) out.push("gap")
  }
  return out
}

export interface OrderListPaginationProps {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
}

export function OrderListPagination({
  currentPage,
  totalPages,
  onChange,
}: OrderListPaginationProps) {
  const t = useTranslations()
  if (totalPages <= 1) return null
  const pages = buildPageList(currentPage, totalPages)
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  const baseBtn =
    "text-body-sm inline-flex h-10 items-center gap-1 rounded-md px-3 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
  const enabled = "border-ink-200 text-ink-700 hover:bg-ink-50 border"
  const disabled = "border-ink-100 text-ink-400 border cursor-not-allowed"

  return (
    <nav
      aria-label={t("pagination.page", { page: currentPage, total: totalPages })}
      data-slot="orders-pagination"
      className="flex items-center justify-center gap-1"
    >
      <button
        type="button"
        onClick={() => hasPrev && onChange(currentPage - 1)}
        disabled={!hasPrev}
        aria-label={t("pagination.prev")}
        className={cn(baseBtn, hasPrev ? enabled : disabled)}
      >
        <ChevronLeftIcon aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">{t("pagination.prev")}</span>
      </button>

      <ol className="flex items-center gap-1">
        {pages.map((page, index) =>
          page === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className="text-ink-400 px-2">
              …
            </li>
          ) : (
            <li key={page}>
              {page === currentPage ? (
                <span
                  aria-current="page"
                  className={cn(
                    "text-body-sm inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 font-medium",
                    "bg-brand-500 text-white",
                  )}
                >
                  {page}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onChange(page)}
                  className={cn(
                    "text-body-sm inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3",
                    "border-ink-200 text-ink-700 hover:bg-ink-50 border",
                    "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                  )}
                >
                  {page}
                </button>
              )}
            </li>
          ),
        )}
      </ol>

      <button
        type="button"
        onClick={() => hasNext && onChange(currentPage + 1)}
        disabled={!hasNext}
        aria-label={t("pagination.next")}
        className={cn(baseBtn, hasNext ? enabled : disabled)}
      >
        <span className="hidden sm:inline">{t("pagination.next")}</span>
        <ChevronRightIcon aria-hidden="true" className="size-4" />
      </button>
    </nav>
  )
}
