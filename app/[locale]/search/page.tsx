import type { Metadata } from "next"
import { SearchIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { hasLocale } from "next-intl"
import { notFound } from "next/navigation"

import { Pagination } from "@/components/catalog/Pagination"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ProductCard } from "@/components/product/ProductCard"
import { SearchSynonymChips } from "@/components/search/SearchSynonymChips"
import { type Locale, locales } from "@/i18n/config"
import { getSearchResults } from "@/lib/api/catalog"
import { getSiteUrl } from "@/lib/seo/site-url"
import { cn } from "@/lib/utils"

// Search results — RSC. DESIGN §12.12 + Phase 7 plan §7.4.4.
// URL-driven state: `?q=` is the source of truth, `?page=N` advances
// pagination. SortSelect is omitted on this route (Phase 7 plan D8 —
// backend's composite ranking is the source of truth for relevance order;
// no FE-side sort selector here).
//
// State branches:
//   - q.length < 2 → render the "min 2 chars" hint plus popular-searches
//     suggestions (when backend exposes them). Bookmarkable URL.
//   - q present + results: query echo + synonym chip row (when present)
//     + ProductCard grid + Pagination.
//   - q present + zero results: EmptyState with the "try one of these"
//     popular-searches list, sourced from the backend response.

const PAGE_SIZE = 24
const MIN_QUERY_LENGTH = 2

interface SearchPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; page?: string }>
}

function parsePage(raw: string | undefined): number {
  if (!raw) return 1
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  const siteUrl = getSiteUrl()
  // Search results are query-driven and not stable canonical surfaces; we
  // index the bare /search page (the popular-searches landing) but ask
  // crawlers not to index `?q=...` permutations to avoid spam pages.
  return {
    title: t("seo.search.title"),
    description: t("seo.search.description"),
    alternates: {
      canonical: `${siteUrl}/${locale}/search`,
      languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}/search`])),
    },
    robots: { index: true, follow: true },
  }
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params
  if (!hasLocale(locales, locale)) notFound()
  const t = await getTranslations()

  const queryParams = await searchParams
  const rawQuery = (queryParams.q ?? "").trim()
  const page = parsePage(queryParams.page)

  // Below-threshold query: render the hint + suggested popular searches
  // without hitting the backend (the catalog fetcher would short-circuit
  // anyway, but doing it here makes the page reactive to URL changes
  // without a wasted request).
  if (rawQuery.length < MIN_QUERY_LENGTH) {
    return (
      <main className="mx-auto flex max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 text-ink-900 font-semibold">{t("search.placeholder_long")}</h1>
        </header>
        <EmptyState
          icon={SearchIcon}
          title={t("search.too_short")}
          body={t("search.no_results.popular")}
        />
      </main>
    )
  }

  const results = await getSearchResults(locale, { q: rawQuery, page, pageSize: PAGE_SIZE })
  const products = results.items
  const total = results.total
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const synonyms = results.synonyms_used ?? []
  const popular = results.popular_searches ?? []

  const buildPageHref = (target: number) => {
    const params = new URLSearchParams()
    params.set("q", rawQuery)
    if (target !== 1) params.set("page", String(target))
    return `?${params.toString()}`
  }

  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-ink-900 font-semibold">
          {t("search.results_for", { q: rawQuery })}
        </h1>
        <p className="text-body-sm text-ink-500">
          {t("category.products_count", { count: total })}
        </p>
      </header>

      <SearchSynonymChips locale={locale} synonyms={synonyms} />

      {products.length === 0 ? (
        <div className="flex flex-col gap-4">
          <EmptyState icon={SearchIcon} title={t("search.no_results.title", { q: rawQuery })} />
          {popular.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-body-sm text-ink-500 font-semibold tracking-wide uppercase">
                {t("search.no_results.popular")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {popular.map((term) => (
                  <li key={term}>
                    <Link
                      href={`/${locale}/search?q=${encodeURIComponent(term)}`}
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1",
                        "border-ink-200 bg-surface-card text-body-sm text-ink-800 border",
                        "hover:border-brand-300 hover:bg-brand-50",
                        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                      )}
                    >
                      {term}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} locale={locale as Locale} />
              </li>
            ))}
          </ul>

          <Pagination currentPage={page} totalPages={totalPages} buildHref={buildPageHref} />
        </>
      )}
    </main>
  )
}
