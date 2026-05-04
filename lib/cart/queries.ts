"use client"

import { useQuery } from "@tanstack/react-query"

import { apiClient } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import type { CartRead } from "@/lib/api/types"

// Cart query — server state lives here, surfaced via TanStack Query.
//
// Per CLAUDE.md OP-13: cart fetchers are mutation paths and MUST throw
// ApiError loudly. The read-only useCart() ALSO throws (not catches)
// because consumers need to distinguish "empty cart" (items.length === 0)
// from "error fetching cart" (the throw bubbles up to TanStack Query's
// `error` and the consumer renders an ErrorState — NOT EmptyState). The
// catch-and-empty pattern from lib/api/catalog.ts (Phase 6/7) is forbidden
// for cart surfaces.
//
// staleTime: 0 because cart is hot data — every page mounting a CartIcon
// or rendering /cart wants fresh state. refetchOnWindowFocus on for the
// same reason: another tab may have edited the cart.

export const cartQueryKey = ["cart"] as const

export function useCart() {
  return useQuery({
    queryKey: cartQueryKey,
    queryFn: async (): Promise<CartRead> => {
      const response = await apiClient.GET("/api/v1/cart" as never)
      const data = (response as { data?: CartRead }).data
      if (!data) {
        // Loud throw — consumers branch on `error` to render ErrorState.
        throw new ApiError({
          code: "cart_response_missing_data",
          status: 0,
          context: {},
        })
      }
      return data
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}
