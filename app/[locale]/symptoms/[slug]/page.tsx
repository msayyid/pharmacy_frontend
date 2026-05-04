import type { Metadata } from "next"
import { ChevronRightIcon, HomeIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Pagination } from "@/components/catalog/Pagination"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ProductCard } from "@/components/product/ProductCard"
import { type Locale, locales } from "@/i18n/config"
import { hasLocale } from "next-intl"
import { getSymptomProducts, getSymptoms } from "@/lib/api/catalog"
import { getSiteUrl } from "@/lib/seo/site-url"
import { cn } from "@/lib/utils"

// Symptom landing — RSC. Name + product grid. Backend has no
// GET-by-slug detail route for symptoms (OQ-18) and the symptom-products
// endpoint returns products only, so we fetch the full symptoms list
// (cheap, cached 5m) and look the slug up to surface the name.
//
// Sort is fixed at relevance (the symptom-products endpoint doesn't
// expose a sort parameter; ranking is backend-controlled). Pagination
// works the same as on category detail.
//
// Breadcrumb is rendered inline (not via the Breadcrumb component) — the
// symptom flow's parents are Home → Symptoms → <symptom>, which doesn't
// match the CategoryDetail.breadcrumb shape.

const PAGE_SIZE = 24

interface SymptomLandingPageProps {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ page?: string }>
}

function parsePage(raw: string | undefined): number {
  if (!raw) return 1
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

export async function generateMetadata({ params }: SymptomLandingPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const symptoms = await getSymptoms(locale)
  const symptom = symptoms.find((s) => s.slug === slug)
  const siteUrl = getSiteUrl()
  const t = await getTranslations({ locale })
  const baseAlternates = {
    canonical: `${siteUrl}/${locale}/symptoms/${slug}`,
    languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}/symptoms/${slug}`])),
  }
  if (!symptom) return { alternates: baseAlternates }
  return {
    title: symptom.name,
    description: t("seo.symptoms.description"),
    alternates: baseAlternates,
  }
}

export default async function SymptomLandingPage({
  params,
  searchParams,
}: SymptomLandingPageProps) {
  const { locale, slug } = await params
  if (!hasLocale(locales, locale)) notFound()
  const t = await getTranslations()

  const queryParams = await searchParams
  const page = parsePage(queryParams.page)

  const [symptoms, productsPage] = await Promise.all([
    getSymptoms(locale),
    getSymptomProducts(locale, { slug, page, pageSize: PAGE_SIZE }),
  ])

  const symptom = symptoms.find((s) => s.slug === slug)
  if (!symptom) notFound()

  const products = productsPage.items
  const productsCount = productsPage.total
  const totalPages = Math.max(1, Math.ceil(productsCount / PAGE_SIZE))

  const buildPageHref = (target: number) =>
    target === 1 ? `/${locale}/symptoms/${slug}` : `?page=${target}`

  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
      <nav aria-label={t("symptom.page_title")} data-slot="breadcrumb" className="text-body-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li className="flex items-center gap-1.5">
            <HomeIcon aria-hidden="true" className="text-ink-500 size-3.5" />
            <Link
              href={`/${locale}`}
              className={cn(
                "text-ink-600 hover:text-ink-900",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              {t("nav.home")}
            </Link>
            <ChevronRightIcon aria-hidden="true" className="text-ink-400 size-3.5 flex-none" />
          </li>
          <li className="flex items-center gap-1.5">
            <Link
              href={`/${locale}/symptoms`}
              className={cn(
                "text-ink-600 hover:text-ink-900",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              {t("symptom.page_title")}
            </Link>
            <ChevronRightIcon aria-hidden="true" className="text-ink-400 size-3.5 flex-none" />
          </li>
          <li>
            <span aria-current="page" className="text-ink-900">
              {symptom.name}
            </span>
          </li>
        </ol>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-ink-900 font-semibold">{symptom.name}</h1>
        <p className="text-body-sm text-ink-500">
          {t("symptom.products_count", { count: productsCount })}
        </p>
      </header>

      {products.length === 0 ? (
        <EmptyState title={t("category.no_products")} />
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
