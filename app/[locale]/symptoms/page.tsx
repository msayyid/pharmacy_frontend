import { getTranslations } from "next-intl/server"

import { EmptyState } from "@/components/feedback/EmptyState"
import { SymptomTile } from "@/components/symptom/SymptomTile"
import { getSymptoms } from "@/lib/api/catalog"

// Symptoms index — RSC. Full list of symptoms returned by /api/v1/symptoms,
// ordered server-side by sort_order. Empty-state when the catalog hasn't
// been seeded with symptoms yet (or backend returns []).

interface SymptomsIndexPageProps {
  params: Promise<{ locale: string }>
}

export default async function SymptomsIndexPage({ params }: SymptomsIndexPageProps) {
  const { locale } = await params
  const t = await getTranslations()
  const symptoms = await getSymptoms(locale)

  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-ink-900 font-semibold">{t("symptom.page_title")}</h1>
      </header>

      {symptoms.length === 0 ? (
        <EmptyState title={t("category.no_products")} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {symptoms.map((symptom) => (
            <li key={symptom.id}>
              <SymptomTile symptom={symptom} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
