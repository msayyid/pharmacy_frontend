import "server-only"

import { createServerApiClient } from "./server"
import type { Branch, CategoryDetail, CategoryNode, ProductsPage, Symptom } from "./types"

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
} as const

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

export async function getCategoriesTree(locale: string): Promise<CategoryNode[]> {
  const client = createServerApiClient(locale)
  const response = await client.GET("/api/v1/categories", {
    next: { revalidate: REVALIDATE.categoriesTree },
  } as never)
  return ((response as { data?: CategoryNode[] }).data ?? []) as CategoryNode[]
}

export async function getCategoryDetail(
  slug: string,
  locale: string,
): Promise<CategoryDetail | null> {
  const client = createServerApiClient(locale)
  const response = await client.GET("/api/v1/categories/{slug}", {
    params: { path: { slug } },
    next: { revalidate: REVALIDATE.categoryDetail },
  } as never)
  return ((response as { data?: CategoryDetail }).data ?? null) as CategoryDetail | null
}

export async function getCategoryProducts(
  locale: string,
  { slug, page = 1, pageSize = 24, sort = "relevance", inStockOnly = true }: CategoryProductsParams,
): Promise<ProductsPage> {
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
  return ((response as { data?: ProductsPage }).data ?? {
    items: [],
    total: 0,
    page,
    page_size: pageSize,
  }) as ProductsPage
}

export async function getSymptoms(locale: string): Promise<Symptom[]> {
  const client = createServerApiClient(locale)
  const response = await client.GET("/api/v1/symptoms", {
    next: { revalidate: REVALIDATE.symptomsList },
  } as never)
  return ((response as { data?: Symptom[] }).data ?? []) as Symptom[]
}

export async function getSymptomProducts(
  locale: string,
  { slug, page = 1, pageSize = 24, inStockOnly = true }: SymptomProductsParams,
): Promise<ProductsPage> {
  const client = createServerApiClient(locale)
  const response = await client.GET("/api/v1/symptoms/{slug}/products", {
    params: {
      path: { slug },
      query: { page, page_size: pageSize, in_stock_only: inStockOnly },
    },
    next: { revalidate: REVALIDATE.symptomProducts },
  } as never)
  return ((response as { data?: ProductsPage }).data ?? {
    items: [],
    total: 0,
    page,
    page_size: pageSize,
  }) as ProductsPage
}

export async function getBranches(locale: string): Promise<Branch[]> {
  const client = createServerApiClient(locale)
  const response = await client.GET("/api/v1/branches", {
    next: { revalidate: REVALIDATE.branches },
  } as never)
  return ((response as { data?: Branch[] }).data ?? []) as Branch[]
}
