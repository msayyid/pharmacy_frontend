import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

import { Breadcrumb } from "@/components/catalog/Breadcrumb"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ProductCard } from "@/components/product/ProductCard"
import { type Locale, locales } from "@/i18n/config"
import { hasLocale } from "next-intl"
import { getCategoryDetail, getCategoryProducts } from "@/lib/api/catalog"

// Category detail page — RSC. Per Phase 6 plan Q2: products grid is
// folded in here (no separate /products sub-route). DESIGN §12.5
// anatomy: breadcrumb, name + description, sort dropdown (Phase 6D),
// product grid (4-up desktop / 2-up tablet / 1-up phone), pagination
// (Phase 6D).
//
// Sub-phase 6C delivers: breadcrumb + name + product grid wired to
// real backend data. Pagination + SortSelect arrive in 6D and replace
// the static page=1 / sort=relevance call here.

interface CategoryDetailPageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { locale, slug } = await params
  if (!hasLocale(locales, locale)) notFound()
  const t = await getTranslations()

  const [detail, productsPage] = await Promise.all([
    getCategoryDetail(slug, locale),
    getCategoryProducts(locale, { slug, page: 1, pageSize: 24, sort: "relevance" }),
  ])

  if (!detail) notFound()

  const products = productsPage.items
  const productsCount = productsPage.total

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
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} locale={locale as Locale} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
