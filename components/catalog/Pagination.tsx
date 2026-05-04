import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

import { cn } from "@/lib/utils"

// Pagination — DESIGN §12.5 + Phase 6 plan D3 (page-numbered, 24/page).
// URL-driven: state lives in `?page=N`; everything else (sort, filter)
// stays put. RSC — renders <Link>s the user navigates to. No client JS.
//
// Page-number window: shows the current page, ±2 neighbours, and the
// first/last page with ellipsis when there's a gap. Caps at 7 visible
// page buttons total — comfortable on mobile while still reachable on
// desktop without overcrowding.

export interface PaginationProps {
  currentPage: number
  totalPages: number
  buildHref: (page: number) => string
}

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

export async function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null
  const t = await getTranslations()
  const pages = buildPageList(currentPage, totalPages)
  const prevHref = currentPage > 1 ? buildHref(currentPage - 1) : null
  const nextHref = currentPage < totalPages ? buildHref(currentPage + 1) : null

  return (
    <nav
      aria-label={t("pagination.page", { page: currentPage, total: totalPages })}
      data-slot="pagination"
      className="flex items-center justify-center gap-1"
    >
      {prevHref ? (
        <Link
          href={prevHref}
          rel="prev"
          aria-label={t("pagination.prev")}
          className={cn(
            "text-body-sm inline-flex h-10 items-center gap-1 rounded-md px-3",
            "border-ink-200 text-ink-700 hover:bg-ink-50 border",
            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          )}
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">{t("pagination.prev")}</span>
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "text-body-sm inline-flex h-10 items-center gap-1 rounded-md px-3",
            "border-ink-100 text-ink-400 border",
          )}
        >
          <ChevronLeftIcon className="size-4" />
          <span className="hidden sm:inline">{t("pagination.prev")}</span>
        </span>
      )}

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
                <Link
                  href={buildHref(page)}
                  className={cn(
                    "text-body-sm inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3",
                    "border-ink-200 text-ink-700 hover:bg-ink-50 border",
                    "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                  )}
                >
                  {page}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>

      {nextHref ? (
        <Link
          href={nextHref}
          rel="next"
          aria-label={t("pagination.next")}
          className={cn(
            "text-body-sm inline-flex h-10 items-center gap-1 rounded-md px-3",
            "border-ink-200 text-ink-700 hover:bg-ink-50 border",
            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          )}
        >
          <span className="hidden sm:inline">{t("pagination.next")}</span>
          <ChevronRightIcon aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "text-body-sm inline-flex h-10 items-center gap-1 rounded-md px-3",
            "border-ink-100 text-ink-400 border",
          )}
        >
          <span className="hidden sm:inline">{t("pagination.next")}</span>
          <ChevronRightIcon className="size-4" />
        </span>
      )}
    </nav>
  )
}
