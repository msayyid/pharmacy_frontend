import { getTranslations } from "next-intl/server"
import Link from "next/link"

import { CategoryCard } from "@/components/catalog/CategoryCard"
import { Hero } from "@/components/marketing/Hero"
import { TrustStrip } from "@/components/marketing/TrustStrip"
import { SymptomTile } from "@/components/symptom/SymptomTile"
import { getCategoriesTree, getSymptoms } from "@/lib/api/catalog"
import { cn } from "@/lib/utils"

// Homepage — RSC, DESIGN §12.4 anatomy. Sections top-to-bottom:
//   1. Hero (type-led, Pattern A)
//   2. Symptom grid (top 12)
//   3. Featured categories (top 6 root-level)
//   4. Trust strip
//
// Search is a Phase 7 surface; the hero CTA points to /categories per
// Phase 6 plan Q1. Cart and product cards arrive in later phases.
//
// Both fetches run in parallel via Promise.all so the slowest of the two
// gates the time-to-paint, not the sum.

interface HomePageProps {
  params: Promise<{ locale: string }>
}

const SYMPTOM_LIMIT = 12
const CATEGORY_LIMIT = 6

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  const t = await getTranslations()

  const [symptoms, categoriesTree] = await Promise.all([
    getSymptoms(locale),
    getCategoriesTree(locale),
  ])

  const visibleSymptoms = symptoms.slice(0, SYMPTOM_LIMIT)
  const featuredCategories = categoriesTree.slice(0, CATEGORY_LIMIT)

  return (
    <div className="flex flex-col">
      <Hero locale={locale} />

      {visibleSymptoms.length > 0 ? (
        <section
          data-slot="home-symptoms"
          aria-labelledby="home-symptoms-heading"
          className="mx-auto w-full max-w-screen-xl px-4 py-8 md:px-6 md:py-12"
        >
          <div className="mb-6 flex items-baseline justify-between">
            <h2 id="home-symptoms-heading" className="text-h2 text-ink-900 font-semibold">
              {t("home.section.symptoms")}
            </h2>
            <Link
              href={`/${locale}/symptoms`}
              className={cn(
                "text-body-sm text-brand-600 hover:text-brand-700",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              {t("symptom.page_title")} →
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {visibleSymptoms.map((symptom) => (
              <li key={symptom.id}>
                <SymptomTile symptom={symptom} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {featuredCategories.length > 0 ? (
        <section
          data-slot="home-categories"
          aria-labelledby="home-categories-heading"
          className="mx-auto w-full max-w-screen-xl px-4 py-8 md:px-6 md:py-12"
        >
          <div className="mb-6 flex items-baseline justify-between">
            <h2 id="home-categories-heading" className="text-h2 text-ink-900 font-semibold">
              {t("home.section.categories")}
            </h2>
            <Link
              href={`/${locale}/categories`}
              className={cn(
                "text-body-sm text-brand-600 hover:text-brand-700",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              {t("category.page_title")} →
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCategories.map((category) => (
              <li key={category.id}>
                <CategoryCard category={category} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <TrustStrip locale={locale} />
    </div>
  )
}
