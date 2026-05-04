"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import * as React from "react"

import type { SuggestResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// SearchSuggest — DESIGN §12.1 + Phase 7 plan §7.4.5. Dropdown panel
// rendered below the SearchInput with three sections: Products, Categories,
// Symptoms. Keyboard navigation: ArrowDown / ArrowUp cycle through items;
// Enter activates; Esc closes (the parent's keydown handles the latter
// two — this component just renders the list with focusable links and
// publishes data-suggest-item="true" so the parent can collect them).
//
// Backend SuggestResponse has `products[]`, `categories[]`, `symptoms[]` —
// no ingredients (PRODUCT §F-CAT-005 + research finding F.1). We render
// in that order, headings localized via t("search.suggest.*").

export interface SearchSuggestProps {
  locale: string
  query: string
  data: SuggestResponse
  loading: boolean
  onSelect?: () => void
  className?: string
}

export function SearchSuggest({
  locale,
  query,
  data,
  loading,
  onSelect,
  className,
}: SearchSuggestProps) {
  const t = useTranslations()
  const products = data.products ?? []
  const categories = data.categories ?? []
  const symptoms = data.symptoms ?? []
  const totalCount = products.length + categories.length + symptoms.length

  if (query.trim().length < 2) return null
  if (loading && totalCount === 0) {
    return (
      <div
        data-slot="search-suggest"
        role="listbox"
        aria-busy="true"
        className={cn(
          "absolute top-full right-0 left-0 mt-2 max-h-96 overflow-y-auto rounded-md",
          "border-ink-100 bg-surface-card shadow-elev2 border",
          "text-body-sm text-ink-500 p-3",
          className,
        )}
      >
        {t("search.placeholder")}…
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div
        data-slot="search-suggest"
        role="listbox"
        className={cn(
          "absolute top-full right-0 left-0 mt-2 rounded-md",
          "border-ink-100 bg-surface-card shadow-elev2 border",
          "text-body-sm text-ink-600 p-3",
          className,
        )}
      >
        {t("search.no_results.title", { q: query })}
      </div>
    )
  }

  return (
    <div
      data-slot="search-suggest"
      role="listbox"
      aria-label={t("nav.search")}
      className={cn(
        "absolute top-full right-0 left-0 mt-2 max-h-[28rem] overflow-y-auto rounded-md",
        "border-ink-100 bg-surface-card shadow-elev2 border",
        className,
      )}
    >
      {products.length > 0 ? (
        <SuggestSection title={t("search.suggest.products")}>
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/${locale}/products/${product.slug}`}
              data-suggest-item="true"
              role="option"
              {...(onSelect ? { onClick: onSelect } : {})}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2",
                "hover:bg-ink-50",
                "focus-visible:bg-brand-50 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
              )}
            >
              <span className="bg-brand-50 relative size-10 flex-none overflow-hidden rounded-md">
                {product.thumbnail_url ? (
                  <Image
                    src={product.thumbnail_url}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : null}
              </span>
              <span className="text-body-sm text-ink-900 flex-1 truncate">{product.name}</span>
            </Link>
          ))}
        </SuggestSection>
      ) : null}

      {categories.length > 0 ? (
        <SuggestSection title={t("search.suggest.categories")}>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${locale}/categories/${category.slug}`}
              data-suggest-item="true"
              role="option"
              {...(onSelect ? { onClick: onSelect } : {})}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2",
                "hover:bg-ink-50",
                "focus-visible:bg-brand-50 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
              )}
            >
              <span className="text-body-sm text-ink-900">{category.name}</span>
            </Link>
          ))}
        </SuggestSection>
      ) : null}

      {symptoms.length > 0 ? (
        <SuggestSection title={t("search.suggest.symptoms")}>
          {symptoms.map((symptom) => (
            <Link
              key={symptom.id}
              href={`/${locale}/symptoms/${symptom.slug}`}
              data-suggest-item="true"
              role="option"
              {...(onSelect ? { onClick: onSelect } : {})}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2",
                "hover:bg-ink-50",
                "focus-visible:bg-brand-50 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
              )}
            >
              <span className="text-body-sm text-ink-900">{symptom.name}</span>
            </Link>
          ))}
        </SuggestSection>
      ) : null}

      <div className="border-ink-100 border-t p-2">
        <Link
          href={`/${locale}/search?q=${encodeURIComponent(query)}`}
          data-suggest-item="true"
          role="option"
          {...(onSelect ? { onClick: onSelect } : {})}
          className={cn(
            "text-body-sm text-brand-600 block rounded-md px-3 py-2 font-medium",
            "hover:bg-brand-50",
            "focus-visible:bg-brand-50 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
          )}
        >
          {t("search.results_for", { q: query })} →
        </Link>
      </div>
    </div>
  )
}

function SuggestSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-2 py-1.5">
      <h3 className="text-caption text-ink-500 px-3 py-1 font-semibold tracking-wide uppercase">
        {title}
      </h3>
      <div className="flex flex-col">{children}</div>
    </section>
  )
}
