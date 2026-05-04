"use client"

import { useQuery } from "@tanstack/react-query"

import { apiClient } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import type { OrderListPage, OrderRead } from "@/lib/api/types"

import { isTerminal } from "./lifecycle"

// Order queries — surface-level data for /[locale]/orders and
// /[locale]/orders/[orderNumber].
//
// OP-13 contract: orders are personal data, NOT a browse surface, so the
// catalog catch-and-empty pattern is FORBIDDEN here. Both fetchers throw
// ApiError loudly so consumers render <ErrorState> on failure rather than
// masquerading as <EmptyState>. Empty data is a legitimate empty-state
// (`items.length === 0` for the list); a fetch failure is not.
//
// Phase 10 plan D9: success-framing fallback for the detail page is the
// PAGE's responsibility (it owns the `retry` budget + the fallback
// component); useOrder just throws once the budget is exhausted.

export const orderListQueryKey = (page: number, pageSize: number) =>
  ["orders", "list", page, pageSize] as const

export const orderQueryKey = (orderNumber: string) => ["order", orderNumber] as const

export interface UseOrderListInput {
  page?: number
  pageSize?: number
}

/**
 * Paginated order history at GET /api/v1/me/orders.
 * Page-based (NOT useInfiniteQuery) — matches the URL-driven Pagination
 * pattern from Phase 6 (`/categories/[slug]`).
 */
export function useOrderList({ page = 1, pageSize = 24 }: UseOrderListInput = {}) {
  return useQuery({
    queryKey: orderListQueryKey(page, pageSize),
    queryFn: async (): Promise<OrderListPage> => {
      const response = await apiClient.GET(
        "/api/v1/me/orders" as never,
        {
          params: { query: { page, page_size: pageSize } },
        } as never,
      )
      const data = (response as { data?: OrderListPage }).data
      if (!data) {
        throw new ApiError({
          code: "order_list_response_missing_data",
          status: 0,
          context: {},
        })
      }
      return data
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Single-order detail with Q-12 polling: 60s while non-terminal,
 * stops on `delivered | cancelled | refunded`. Background-tab
 * refetch is paused.
 *
 * The 9E success-framing fallback (D9) — render a calm "we'll call
 * you in 10 min" block on retries-exhausted — lives at the page
 * level, not here. This hook just retries up to 2x with exp-backoff
 * and throws once the budget is exhausted.
 */
export function useOrder(orderNumber: string) {
  return useQuery({
    queryKey: orderQueryKey(orderNumber),
    queryFn: async (): Promise<OrderRead> => {
      const response = await apiClient.GET(
        "/api/v1/me/orders/{order_number}" as never,
        { params: { path: { order_number: orderNumber } } } as never,
      )
      const data = (response as { data?: OrderRead }).data
      if (!data) {
        throw new ApiError({
          code: "order_response_missing_data",
          status: 0,
          context: {},
        })
      }
      return data
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return isTerminal(status) ? false : 60_000
    },
    refetchIntervalInBackground: false,
    staleTime: 0,
  })
}
