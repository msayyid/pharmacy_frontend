import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { CategoryTree } from "@/components/catalog/CategoryTree"
import { EmptyState } from "@/components/feedback/EmptyState"
import { locales } from "@/i18n/config"
import { getCategoriesTree } from "@/lib/api/catalog"
import { getSiteUrl } from "@/lib/seo/site-url"

// Categories index — RSC. DESIGN §12.5 + Phase 6 6C. Renders the full
// active tree returned by /api/v1/categories. Empty-state when the
// backend returns no categories (e.g., during the OQ-22 outage window
// or when the catalog hasn't been seeded yet).

interface CategoriesIndexPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CategoriesIndexPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  const siteUrl = getSiteUrl()
  return {
    title: t("seo.categories.title"),
    description: t("seo.categories.description"),
    alternates: {
      canonical: `${siteUrl}/${locale}/categories`,
      languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}/categories`])),
    },
  }
}

export default async function CategoriesIndexPage({ params }: CategoriesIndexPageProps) {
  const { locale } = await params
  const t = await getTranslations()
  const tree = await getCategoriesTree(locale)

  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-ink-900 font-semibold">{t("category.page_title")}</h1>
      </header>

      {tree.length === 0 ? (
        <EmptyState title={t("category.no_products")} body={t("error.network")} />
      ) : (
        <CategoryTree categories={tree} locale={locale} />
      )}
    </main>
  )
}
