import "server-only"

import { createServerApiClient } from "./server"
import type {
  Branch,
  CategoryDetail,
  CategoryNode,
  ProductCard,
  ProductDetail,
  ProductsPage,
  SearchResults,
  SuggestResponse,
  Symptom,
} from "./types"

// Server-only catalog fetchers used by Phase 6 RSC pages. Each helper sets
// the per-surface `next.revalidate` window per FRONTEND_BLUEPRINT §15.2 so
// the Next data cache holds responses for as long as the backend's Redis
// cache is valid (categories tree 1h backend → 5m FE), or short-circuits
// for hot paths (product lists 30s).
//
// Each helper throws ApiError on non-2xx via the server client's onResponse
// middleware. Callers are RSC pages with their own error.tsx — they don't
// need to try/catch unless the page wants a tailored fallback.

const REVALIDATE = {
  categoriesTree: 300,
  categoryDetail: 60,
  categoryProducts: 30,
  symptomsList: 300,
  symptomProducts: 30,
  branches: 3600,
  productDetail: 60,
  productRelated: 60,
  searchSuggest: 30,
} as const

export interface SearchParams {
  q: string
  page?: number
  pageSize?: number
}

export interface CategoryProductsParams {
  slug: string
  page?: number
  pageSize?: number
  sort?: "relevance" | "price_asc" | "price_desc" | "name_asc"
  inStockOnly?: boolean
}

export interface SymptomProductsParams {
  slug: string
  page?: number
  pageSize?: number
  inStockOnly?: boolean
}

// Every helper takes `locale` as the FIRST argument and threads it through to
// `createServerApiClient(locale)` so the backend receives Accept-Language: ky
// when the URL is /ky/..., regardless of what the browser's Accept-Language
// header says. Phase 6 6B smoke caught the asymmetric default: a curl with
// no Accept-Language hitting /ky returned Russian content because we were
// forwarding the inbound (empty) header instead of the URL locale.
//
// Every helper SWALLOWS fetch failures (backend down, network timeout, 5xx)
// and returns the empty default. This is the "graceful empty state"
// contract — RSC pages render their EmptyState component when the catalog
// surface returns nothing, regardless of whether the backend is fully down,
// returning [], or transient-erroring. The alternative (propagating the
// throw to error.tsx) makes /ru/categories a hard error page when the
// backend hiccups, which doesn't match the storefront's "calm and
// readable" design ethos. Surfaced during Phase 6 close: CI's webserver
// has no backend at :8000, so the homepage's RSC fetches were 500ing
// the whole page; this fix makes the empty path the default.

const EMPTY_PRODUCTS_PAGE = (page: number, pageSize: number): ProductsPage => ({
  items: [],
  total: 0,
  page,
  page_size: pageSize,
})

export async function getCategoriesTree(locale: string): Promise<CategoryNode[]> {
  try {
    const client = createServerApiClient(locale)
    const response = await client.GET("/api/v1/categories", {
      next: { revalidate: REVALIDATE.categoriesTree },
    } as never)
    return ((response as { data?: CategoryNode[] }).data ?? []) as CategoryNode[]
  } catch {
    return []
  }
}

export async function getCategoryDetail(
  slug: string,
  locale: string,
): Promise<CategoryDetail | null> {
  try {
    const client = createServerApiClient(locale)
    const response = await client.GET("/api/v1/categories/{slug}", {
      params: { path: { slug } },
      next: { revalidate: REVALIDATE.categoryDetail },
    } as never)
    return ((response as { data?: CategoryDetail }).data ?? null) as CategoryDetail | null
  } catch {
    return null
  }
}

export async function getCategoryProducts(
  locale: string,
  { slug, page = 1, pageSize = 24, sort = "relevance", inStockOnly = true }: CategoryProductsParams,
): Promise<ProductsPage> {
  try {
    const client = createServerApiClient(locale)
    const response = await client.GET("/api/v1/categories/{slug}/products", {
      params: {
        path: { slug },
        query: {
          page,
          page_size: pageSize,
          sort,
          in_stock_only: inStockOnly,
        },
      },
      next: { revalidate: REVALIDATE.categoryProducts },
    } as never)
    return ((response as { data?: ProductsPage }).data ??
      EMPTY_PRODUCTS_PAGE(page, pageSize)) as ProductsPage
  } catch {
    return EMPTY_PRODUCTS_PAGE(page, pageSize)
  }
}

export async function getSymptoms(locale: string): Promise<Symptom[]> {
  try {
    const client = createServerApiClient(locale)
    const response = await client.GET("/api/v1/symptoms", {
      next: { revalidate: REVALIDATE.symptomsList },
    } as never)
    return ((response as { data?: Symptom[] }).data ?? []) as Symptom[]
  } catch {
    return []
  }
}

export async function getSymptomProducts(
  locale: string,
  { slug, page = 1, pageSize = 24, inStockOnly = true }: SymptomProductsParams,
): Promise<ProductsPage> {
  try {
    const client = createServerApiClient(locale)
    const response = await client.GET("/api/v1/symptoms/{slug}/products", {
      params: {
        path: { slug },
        query: { page, page_size: pageSize, in_stock_only: inStockOnly },
      },
      next: { revalidate: REVALIDATE.symptomProducts },
    } as never)
    return ((response as { data?: ProductsPage }).data ??
      EMPTY_PRODUCTS_PAGE(page, pageSize)) as ProductsPage
  } catch {
    return EMPTY_PRODUCTS_PAGE(page, pageSize)
  }
}

export async function getBranches(locale: string): Promise<Branch[]> {
  try {
    const client = createServerApiClient(locale)
    const response = await client.GET("/api/v1/branches", {
      next: { revalidate: REVALIDATE.branches },
    } as never)
    return ((response as { data?: Branch[] }).data ?? []) as Branch[]
  } catch {
    return []
  }
}

// ─── Phase 7: PDP + search ─────────────────────────────────────────────────
// Same catch-and-empty contract per CLAUDE.md Operating Principle 13:
// read-only browse fetchers return null / empty defaults on failure so
// pages render their EmptyState surface instead of error.tsx.

export async function getProductDetail(
  slug: string,
  locale: string,
): Promise<ProductDetail | null> {
  try {
    const client = createServerApiClient(locale)
    const response = await client.GET("/api/v1/products/{slug}", {
      params: { path: { slug } },
      next: { revalidate: REVALIDATE.productDetail },
    } as never)
    return ((response as { data?: ProductDetail }).data ?? null) as ProductDetail | null
  } catch {
    return null
  }
}

export async function getRelatedProducts(slug: string, locale: string): Promise<ProductCard[]> {
  try {
    const client = createServerApiClient(locale)
    const response = await client.GET("/api/v1/products/{slug}/related", {
      params: { path: { slug } },
      next: { revalidate: REVALIDATE.productRelated },
    } as never)
    return ((response as { data?: ProductCard[] }).data ?? []) as ProductCard[]
  } catch {
    return []
  }
}

const EMPTY_SEARCH_RESULTS = (page: number, pageSize: number): SearchResults => ({
  items: [],
  total: 0,
  page,
  page_size: pageSize,
  synonyms_used: [],
  popular_searches: [],
})

export async function getSearchResults(
  locale: string,
  { q, page = 1, pageSize = 24 }: SearchParams,
): Promise<SearchResults> {
  // Backend rejects q.length < 2 with a validation error; we short-circuit
  // here so callers can pre-flight without a network round-trip. Pages
  // calling this with q="x" still get a typed empty page they can render.
  if (q.trim().length < 2) {
    return EMPTY_SEARCH_RESULTS(page, pageSize)
  }
  try {
    const client = createServerApiClient(locale)
    const response = await client.GET("/api/v1/search", {
      params: {
        query: { q: q.trim(), page, page_size: pageSize },
      },
      // Search results are URL-driven and per-query; do not cache.
      cache: "no-store",
    } as never)
    return ((response as { data?: SearchResults }).data ??
      EMPTY_SEARCH_RESULTS(page, pageSize)) as SearchResults
  } catch {
    return EMPTY_SEARCH_RESULTS(page, pageSize)
  }
}

const EMPTY_SUGGEST: SuggestResponse = {
  products: [],
  categories: [],
  symptoms: [],
}

export async function getSuggestResults(locale: string, q: string): Promise<SuggestResponse> {
  if (q.trim().length < 2) return EMPTY_SUGGEST
  try {
    const client = createServerApiClient(locale)
    const response = await client.GET("/api/v1/search/suggest", {
      params: { query: { q: q.trim() } },
      next: { revalidate: REVALIDATE.searchSuggest },
    } as never)
    return ((response as { data?: SuggestResponse }).data ?? EMPTY_SUGGEST) as SuggestResponse
  } catch {
    return EMPTY_SUGGEST
  }
}
