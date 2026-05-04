import { getTranslations } from "next-intl/server"
import Link from "next/link"

import { cn } from "@/lib/utils"

// SearchSynonymChips — DESIGN §12.12 + Phase 7 plan §7.4.4. Renders the
// `synonyms_used[]` array the backend returns on `/api/v1/search` so the
// user knows we also searched for "грипп" / "ОРВИ" when they typed
// "простуда". Each chip is a clickable Link that swaps `?q=` to the
// synonym; the page picks up the new query and runs a fresh search.
//
// Returns null when synonyms_used is empty, so the chip row gracefully
// disappears for queries that don't trigger any synonym expansion.

export interface SearchSynonymChipsProps {
  locale: string
  synonyms: string[]
  className?: string
}

export async function SearchSynonymChips({ locale, synonyms, className }: SearchSynonymChipsProps) {
  if (synonyms.length === 0) return null
  const t = await getTranslations()

  return (
    <div data-slot="synonym-chips" className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-body-sm text-ink-600">{t("search.synonyms_label")}:</span>
      <ul className="flex flex-wrap gap-2">
        {synonyms.map((term) => (
          <li key={term}>
            <Link
              href={`/${locale}/search?q=${encodeURIComponent(term)}`}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1",
                "border-ink-200 bg-surface-card text-body-sm text-ink-800 border",
                "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              {term}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
