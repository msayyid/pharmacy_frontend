import { BRAND } from "@/lib/brand"

// SEO title builder. Per CLAUDE.md brand discipline (Operating Principle:
// "Never hardcode 'Nookat' in code"), the literal brand name must come
// from `BRAND.name`. This thin module pins the canonical title pattern
// (`<page> | Nookat`) in one place so route handlers / generateMetadata
// blocks don't have to repeat the literal.
//
// Phase 7 7A: lands ahead of the PDP route's generateMetadata which
// uses this for `${product.name} | Nookat`.

export interface PageTitleOptions {
  /** Page-specific prefix, e.g. a product name or category name. When
   *  omitted, returns just `BRAND.name` for routes (like the homepage)
   *  that want the bare brand. */
  prefix?: string
  /** Localized brand name override. The visible brand differs by locale
   *  (Cyrillic "Ноокат" for ru/ky, latin "Nookat" for en). Defaults to
   *  the latin form for OG metadata + generic SEO contexts. Pass the
   *  per-locale string from `BRAND.nameLocalized[locale]` for the
   *  `<title>` tag the user actually sees in their browser tab. */
  brand?: string
}

const SEPARATOR = " | "

export function buildPageTitle({ prefix, brand = BRAND.name }: PageTitleOptions = {}): string {
  if (!prefix) return brand
  return `${prefix}${SEPARATOR}${brand}`
}
