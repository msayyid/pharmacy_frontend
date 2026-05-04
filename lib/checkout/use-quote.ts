"use client"

import { useQuery } from "@tanstack/react-query"

import { apiClient } from "@/lib/api/client"
import type { CheckoutQuote, CheckoutQuoteRequest } from "@/lib/api/types"

// useQuote — wraps POST /api/v1/checkout/quote in TanStack Query so
// `queryKey` change automatically refetches. Quote is read-shaped (same
// inputs return the same shape repeatedly) even though the backend
// route is POST.
//
// Per CLAUDE.md OP-13 + Phase 9 plan vigilance directive #1:
// - 200-with-conflicts is structured success — surface inline (ConflictBanner +
//   per-line indicators in ReviewBlock); do NOT throw.
// - 5xx / network errors throw ApiError loudly via the client middleware,
//   handled by the consumer's `error` branch (renders ErrorState).
//
// Refetch triggers per Phase 9 plan D8:
//   - delivery_method change
//   - address_id change
//   - payment_method change
//   - cart contents change (we accept a `cartHash` arg for this; the
//     consumer derives a stable hash from cart.items + cart.totals.subtotal)

export interface UseQuoteInput {
  delivery_method: "delivery" | "pickup"
  payment_method: string
  address_id?: number
  /** Stable hash of cart contents — included in queryKey so cart edits
   *  invalidate the quote naturally. Consumer typically passes
   *  `${cart.items.length}:${cart.totals.subtotal}` or similar. */
  cartHash: string
  /** Disable the query when the cart is empty / not yet loaded /
   *  delivery requires an address that's not picked yet. */
  enabled?: boolean
}

export function useQuote(input: UseQuoteInput) {
  const { delivery_method, payment_method, address_id, cartHash, enabled = true } = input
  return useQuery({
    queryKey: [
      "checkout-quote",
      delivery_method,
      payment_method,
      address_id ?? null,
      cartHash,
    ] as const,
    queryFn: async (): Promise<CheckoutQuote> => {
      const body: CheckoutQuoteRequest = {
        delivery_method,
        payment_method: payment_method as CheckoutQuoteRequest["payment_method"],
        ...(address_id !== undefined ? { address_id } : {}),
      }
      const response = await apiClient.POST(
        "/api/v1/checkout/quote" as never,
        {
          body,
        } as never,
      )
      // OP-13: missing data → throw. Consumers branch on `error`.
      const data = (response as { data?: CheckoutQuote }).data
      if (!data) {
        throw new Error("checkout_quote_response_missing_data")
      }
      return data
    },
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
}
