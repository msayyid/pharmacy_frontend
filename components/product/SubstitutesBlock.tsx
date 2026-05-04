import { ProductCard } from "@/components/product/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { Locale } from "@/i18n/config"
import { getRelatedProducts } from "@/lib/api/catalog"
import type { ProductCard as ProductCardData } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// SubstitutesBlock — DESIGN §12.6 + PRODUCT §F-CAT-007. RSC.
// Two consumption modes per Phase 7 plan D6:
//   1. In-stock product: PDP page wraps <SubstitutesAsync> in <Suspense> so
//      the main content streams first; the related fetch runs in the
//      background. Heading: "С тем же действующим веществом".
//   2. Out-of-stock product: PDP page already fetched related in a
//      Promise.all (no Suspense, no layout shift) and renders <SubstitutesBlock>
//      directly with the prefetched array. Heading: "Доступные альтернативы".
//      Block is promoted above the fold so customers with active intent see
//      "here's what works the same" before they scroll past.
//
// Empty state: returns null. The block is gracefully omitted (per the
// Phase 7 prompt §7.4.3 + plan D5 — no fallback message, no chrome).

export interface SubstitutesBlockProps {
  products: ProductCardData[]
  locale: Locale
  /** i18n key for the section heading. PDP page passes
   *  `product.alternatives.heading_oos` for out-of-stock, or
   *  `product.same_ingredient.heading` for in-stock. */
  heading: string
  className?: string
}

export function SubstitutesBlock({ products, locale, heading, className }: SubstitutesBlockProps) {
  if (products.length === 0) return null

  return (
    <section
      data-slot="substitutes-block"
      aria-labelledby="substitutes-heading"
      className={cn("flex flex-col gap-3", className)}
    >
      <h2 id="substitutes-heading" className="text-h2 text-ink-900 font-semibold">
        {heading}
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} locale={locale} variant="compact" />
          </li>
        ))}
      </ul>
    </section>
  )
}

// Async wrapper for the in-stock Suspense path. PDP page renders this inside
// <Suspense fallback={<SubstitutesSkeleton />}>. See plan R-F mitigation:
// Suspense only fires for in-stock products; OOS products use the inline
// SubstitutesBlock with already-resolved data to avoid layout shift.
export interface SubstitutesAsyncProps {
  slug: string
  locale: Locale
  heading: string
}

export async function SubstitutesAsync({ slug, locale, heading }: SubstitutesAsyncProps) {
  const products = await getRelatedProducts(slug, locale)
  return <SubstitutesBlock products={products} locale={locale} heading={heading} />
}

export function SubstitutesSkeleton({ className }: { className?: string }) {
  return (
    <section
      data-slot="substitutes-skeleton"
      aria-busy="true"
      className={cn("flex flex-col gap-3", className)}
    >
      <Skeleton className="h-8 w-64" />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="aspect-[3/4] w-full rounded-lg" />
          </li>
        ))}
      </ul>
    </section>
  )
}
