import Link from "next/link"

import type { ProductIngredient } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// ActiveIngredientChip — DESIGN §11.3 row of tappable chips below the
// description tabs. Each chip routes to /[locale]/search?q=<inn_name>
// per Phase 7 plan D14 (FULLTEXT-fallback on ingredient match).
//
// Known fallback — when §F-CAT-006 filter-by-ingredient ships on the
// backend, audit this code path for upgrade. The current behavior relies
// on backend's search ranking giving ingredient-match a tier-50 weight
// (above manufacturer's 20), so the first results for "paracetamol"
// will be paracetamol-containing products. Cheap and accurate at MVP;
// proper filter-by-ingredient is a Phase A1+ admin enhancement.

export interface ActiveIngredientChipProps {
  ingredient: ProductIngredient
  locale: string
  className?: string
}

function formatIngredientLabel(ingredient: ProductIngredient): string {
  const display = ingredient.name ?? ingredient.inn_name
  if (ingredient.dosage_amount && ingredient.dosage_unit) {
    return `${display} ${ingredient.dosage_amount} ${ingredient.dosage_unit}`
  }
  return display
}

export function ActiveIngredientChip({ ingredient, locale, className }: ActiveIngredientChipProps) {
  return (
    <Link
      href={`/${locale}/search?q=${encodeURIComponent(ingredient.inn_name)}`}
      data-slot="active-ingredient-chip"
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1",
        "border-ink-200 bg-surface-card text-body-sm text-ink-800 border",
        "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
    >
      {formatIngredientLabel(ingredient)}
    </Link>
  )
}
