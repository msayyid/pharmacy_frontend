import type { MetadataRoute } from "next"

import { locales, type Locale } from "@/i18n/config"
import { getCategoriesTree, getCategoryProducts, getSymptoms } from "@/lib/api/catalog"
import type { CategoryNode } from "@/lib/api/types"
import { getSiteUrl } from "@/lib/seo/site-url"

// Sitemap. Phase 11A. Next App Router contract: a default-export async
// function returning MetadataRoute.Sitemap, served at /sitemap.xml.
//
// We enumerate three buckets per locale (ru / ky / en):
//   1. Static public routes (home, /categories, /symptoms, /about, /search)
//   2. Category slugs (recursive flatten of getCategoriesTree)
//   3. Symptom slugs (getSymptoms)
//   4. Product slugs — top page of each ROOT category at page_size=100.
//      Bounded by category count (4 in current seed); well within Google's
//      50k-URL limit and ~bounded fetch fan-out at build time.
//
// Hard-gated transactional routes (/cart, /checkout, /account, /orders,
// /auth/otp) are deliberately excluded — robots.ts disallows them too.
//
// OP-13 contract: every catalog fetcher is catch-and-empty. If the backend
// is unreachable at build time, the sitemap degrades to static routes only
// rather than crashing `next build`. Verified in tests.

const SITE_URL = getSiteUrl()

const STATIC_ROUTES = ["", "/categories", "/symptoms", "/about", "/search"] as const

function flattenCategorySlugs(nodes: CategoryNode[]): string[] {
  const out: string[] = []
  for (const node of nodes) {
    out.push(node.slug)
    if (node.children && node.children.length > 0) {
      out.push(...flattenCategorySlugs(node.children))
    }
  }
  return out
}

function buildAlternates(path: string): { languages: Record<string, string> } {
  const languages: Record<string, string> = {}
  for (const altLocale of locales) {
    languages[altLocale] = `${SITE_URL}/${altLocale}${path}`
  }
  return { languages }
}

function urlEntry(
  locale: Locale,
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}/${locale}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: buildAlternates(path),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  // The catalog fetchers below are catch-and-empty (OP-13). One locale's
  // tree is enough — slugs are locale-stable. We use ru as the canonical
  // catalog source; per-locale URLs are emitted regardless.
  const [tree, symptoms] = await Promise.all([getCategoriesTree("ru"), getSymptoms("ru")])

  const categorySlugs = flattenCategorySlugs(tree)
  const symptomSlugs = symptoms.map((s) => s.slug)

  // Product slugs from the first page of each ROOT category. Page size
  // capped at 100 (matches backend's max). Backend returns is_in_stock=false
  // products too — we want them in the sitemap because OOS PDPs still
  // surface alternatives and are valid landing pages.
  const productSlugSet = new Set<string>()
  await Promise.all(
    tree.map(async (root) => {
      const page = await getCategoryProducts("ru", {
        slug: root.slug,
        page: 1,
        pageSize: 100,
        inStockOnly: false,
      })
      for (const p of page.items) productSlugSet.add(p.slug)
    }),
  )
  const productSlugs = Array.from(productSlugSet)

  for (const locale of locales) {
    for (const path of STATIC_ROUTES) {
      const priority = path === "" ? 1.0 : 0.8
      entries.push(urlEntry(locale, path, "daily", priority))
    }
    for (const slug of categorySlugs) {
      entries.push(urlEntry(locale, `/categories/${slug}`, "daily", 0.7))
    }
    for (const slug of symptomSlugs) {
      entries.push(urlEntry(locale, `/symptoms/${slug}`, "weekly", 0.6))
    }
    for (const slug of productSlugs) {
      entries.push(urlEntry(locale, `/products/${slug}`, "daily", 0.7))
    }
  }

  return entries
}
