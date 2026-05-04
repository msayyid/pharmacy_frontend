import { FolderIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import type { CategoryNode } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// CategoryTree — full active categories tree at /[locale]/categories.
// Recursive rendering: root nodes are large cards, children listed under
// each as a compact row. The shape mirrors backend CategoryNode whose
// `children: CategoryNode[]` is already populated server-side.
//
// At MVP scale (Q-1 single branch, ~16 root cats per PRODUCT §5) the tree
// is small enough that we render it all server-side without lazy loading.
// If catalog ever exceeds ~100 categories, a Phase 11+ enhancement can
// virtualize or collapse-by-default.

export interface CategoryTreeProps {
  categories: CategoryNode[]
  locale: string
}

export function CategoryTree({ categories, locale }: CategoryTreeProps) {
  return (
    <ul data-slot="category-tree" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <li key={category.id}>
          <CategoryTreeNode category={category} locale={locale} />
        </li>
      ))}
    </ul>
  )
}

interface CategoryTreeNodeProps {
  category: CategoryNode
  locale: string
}

function CategoryTreeNode({ category, locale }: CategoryTreeNodeProps) {
  const icon = category.icon_url
  const children = category.children ?? []

  return (
    <article
      className={cn("border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-4")}
    >
      <Link
        href={`/${locale}/categories/${category.slug}`}
        className={cn(
          "flex items-center gap-3 rounded-md",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-md",
            "bg-brand-50 text-brand-600",
          )}
        >
          {icon ? (
            <Image src={icon} alt="" width={24} height={24} className="size-6 object-contain" />
          ) : (
            <FolderIcon aria-hidden="true" className="size-5" />
          )}
        </span>
        <span className="text-body text-ink-900 font-semibold">{category.name}</span>
      </Link>

      {children.length > 0 ? (
        <ul className="ml-13 flex flex-col gap-1">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/${locale}/categories/${child.slug}`}
                className={cn(
                  "text-body-sm text-ink-700 block rounded-md px-2 py-1.5",
                  "hover:bg-ink-50 hover:text-ink-900",
                  "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                )}
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}
