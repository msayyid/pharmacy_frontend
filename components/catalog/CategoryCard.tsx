import { FolderIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import type { CategoryNode } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// CategoryCard — homepage's "Featured categories" tiles + categories
// index. Wider-than-tall (4:3) on the homepage grid, square on the index
// grid. Variant prop drives the aspect ratio; everything else is identical.
//
// Like SymptomTile, falls back to a neutral folder icon when icon_url is
// absent. ProductCard owns the brand-pill empty-image fallback (DESIGN §8.4).

export interface CategoryCardProps {
  category: CategoryNode
  locale: string
  variant?: "featured" | "grid"
}

export function CategoryCard({ category, locale, variant = "featured" }: CategoryCardProps) {
  const icon = category.icon_url
  const aspect = variant === "featured" ? "aspect-[4/3]" : "aspect-square"

  return (
    <Link
      href={`/${locale}/categories/${category.slug}`}
      className={cn(
        "group border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-4",
        "hover:border-brand-200 hover:bg-brand-50 transition-colors",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        aspect,
      )}
    >
      <span
        className={cn(
          "inline-flex size-12 items-center justify-center rounded-md",
          "bg-brand-50 text-brand-600",
          "group-hover:bg-white",
        )}
      >
        {icon ? (
          <Image src={icon} alt="" width={28} height={28} className="size-7 object-contain" />
        ) : (
          <FolderIcon aria-hidden="true" className="size-6" />
        )}
      </span>
      <span className="text-body text-ink-900 font-semibold">{category.name}</span>
    </Link>
  )
}
