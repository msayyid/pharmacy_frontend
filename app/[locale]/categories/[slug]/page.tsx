import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

import { Breadcrumb } from "@/components/catalog/Breadcrumb"
import { Pagination } from "@/components/catalog/Pagination"
import { SortSelect, type SortValue } from "@/components/catalog/SortSelect"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ProductCard } from "@/components/product/ProductCard"
import { type Locale, locales } from "@/i18n/config"
import { hasLocale } from "next-intl"
import { getCategoryDetail, getCategoryProducts } from "@/lib/api/catalog"
import { getSiteUrl } from "@/lib/seo/site-url"

// Category detail page — RSC. Per Phase 6 plan Q2: products grid is folded
// in here (no separate /products sub-route). DESIGN §12.5 anatomy:
// breadcrumb, name + description, sort dropdown, product grid (4-up
// desktop / 2-up tablet / 1-up phone), pagination.
//
// 6D wires URL-driven page + sort. searchParams reads `?page=N&sort=…`;
// the SortSelect client component writes them back when the user picks
// a new sort; Pagination renders <Link> hrefs that preserve `?sort` and
// only swap `?page`. Both pieces live on the URL so deep-links work.

const PAGE_SIZE = 24
const VALID_SORTS: readonly SortValue[] = [
  "relevance",
  "price_asc",
  "price_desc",
  "name_asc",
] as const

interface CategoryDetailPageProps {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ page?: string; sort?: string }>
}

function parsePage(raw: string | undefined): number {
  if (!raw) return 1
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

function parseSort(raw: string | undefined): SortValue {
  return VALID_SORTS.find((s) => s === raw) ?? "relevance"
}

export async function generateMetadata({ params }: CategoryDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const detail = await getCategoryDetail(slug, locale)
  const siteUrl = getSiteUrl()
  if (!detail) {
    return {
      alternates: {
        canonical: `${siteUrl}/${locale}/categories/${slug}`,
        languages: Object.fromEntries(
          locales.map((l) => [l, `${siteUrl}/${l}/categories/${slug}`]),
        ),
      },
    }
  }
  // Description from category if present; otherwise omit (Next falls back
  // to layout default). Keep it under ~160 chars per SEO guidance.
  const description = detail.description?.slice(0, 160) ?? undefined
  return {
    title: detail.name,
    ...(description ? { description } : {}),
    alternates: {
      canonical: `${siteUrl}/${locale}/categories/${slug}`,
      languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}/categories/${slug}`])),
    },
  }
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: CategoryDetailPageProps) {
  const { locale, slug } = await params
  if (!hasLocale(locales, locale)) notFound()
  const t = await getTranslations()

  const queryParams = await searchParams
  const page = parsePage(queryParams.page)
  const sort = parseSort(queryParams.sort)

  const [detail, productsPage] = await Promise.all([
    getCategoryDetail(slug, locale),
    getCategoryProducts(locale, { slug, page, pageSize: PAGE_SIZE, sort }),
  ])

  if (!detail) notFound()

  const products = productsPage.items
  const productsCount = productsPage.total
  const totalPages = Math.max(1, Math.ceil(productsCount / PAGE_SIZE))

  // Build href for a target page, preserving the current sort. Page 1 +
  // default sort drops the entire query string for a clean canonical URL.
  const buildPageHref = (target: number) => {
    const params = new URLSearchParams()
    if (target !== 1) params.set("page", String(target))
    if (sort !== "relevance") params.set("sort", sort)
    const query = params.toString()
    return query ? `?${query}` : `/${locale}/categories/${slug}`
  }

  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
      <Breadcrumb locale={locale} trail={detail.breadcrumb} />

      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-ink-900 font-semibold">{detail.name}</h1>
        {detail.description ? (
          <p className="text-body text-ink-700 max-w-2xl">{detail.description}</p>
        ) : null}
        <p className="text-body-sm text-ink-500">
          {t("category.products_count", { count: productsCount })}
        </p>
      </header>

      {products.length === 0 ? (
        <EmptyState title={t("category.no_products")} />
      ) : (
        <>
          <div className="flex items-center justify-end">
            <SortSelect className="w-56" />
          </div>

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
