"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/lib/api/client"
import type { CartItemAdd, CartItemUpdate, CartRead } from "@/lib/api/types"

import { cartQueryKey } from "./queries"

// Cart mutations — every helper lets ApiError propagate per CLAUDE.md
// OP-13. Consumers (components) wrap calls in TanStack Query's `onError`
// or in try/catch and surface a localized toast via `t(\`error.\${code}\`)`.
// The catch-and-empty pattern from lib/api/catalog.ts (Phase 6/7) is
// FORBIDDEN here. Cart actions affecting customer money / intent must
// surface failures loudly — see CLAUDE.md > Hard prohibitions and
// DECISION_LOG Phase 8 D1.
//
// Optimistic-update policy (Phase 8 plan D3):
//   - useAddToCart      : NOT optimistic (server computes line ID +
//                          price_snapshot + line_total — local prediction
//                          would flicker for 150-300ms before snapping
//                          to truth).
//   - useUpdateCartItem : OPTIMISTIC (qty change has no server-computed
//                          fields the FE can't predict). Snapshot →
//                          optimistic update → rollback on error →
//                          invalidate on settle.
//   - useRemoveCartItem : OPTIMISTIC (filter out the line in cache;
//                          rollback on error).
//   - useClearCart      : OPTIMISTIC (replace items array with []).
//
// Per Phase 8 plan D4: rapid +/- clicks should COLLAPSE into one final
// PATCH at the consumer (QuantityStepper debounces 200ms after last
// click and dispatches ONE mutation with the final quantity). Mutation
// queue per item ID via mutationKey ensures sequential dispatch when
// the user pauses-and-resumes typing across the debounce window.

interface AddToCartInput {
  productId: string
  quantity: number
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["cart", "add"] as const,
    mutationFn: async ({ productId, quantity }: AddToCartInput): Promise<CartRead> => {
      const body: CartItemAdd = { product_id: productId, quantity }
      const response = await apiClient.POST(
        "/api/v1/cart/items" as never,
        {
          body,
        } as never,
      )
      return (response as { data: CartRead }).data
    },
    onSuccess: (cart) => {
      // Server response is the new authoritative cart — write it directly
      // to the cache so the badge / drawer reflect it without a refetch.
      queryClient.setQueryData(cartQueryKey, cart)
    },
  })
}

interface UpdateCartItemInput {
  itemId: number
  quantity: number
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    // Mutation queue per item ID — TanStack Query serializes mutations
    // sharing a key, so two PATCHes on the same line dispatch in order
    // even when the user mashes +/-. The QuantityStepper's 200ms
    // debounce should collapse rapid clicks to a single PATCH per
    // pause; this queue is the safety net for the cross-pause case.
    mutationKey: ["cart", "update"] as const,
    mutationFn: async ({ itemId, quantity }: UpdateCartItemInput): Promise<CartRead> => {
      const body: CartItemUpdate = { quantity }
      const response = await apiClient.PATCH(
        "/api/v1/cart/items/{item_id}" as never,
        {
          params: { path: { item_id: itemId } },
          body,
        } as never,
      )
      return (response as { data: CartRead }).data
    },
    onMutate: async ({ itemId, quantity }) => {
      // Snapshot the current cart for rollback on error.
      await queryClient.cancelQueries({ queryKey: cartQueryKey })
      const previous = queryClient.getQueryData<CartRead>(cartQueryKey)
      // Optimistically update the matching line's quantity.
      if (previous) {
        queryClient.setQueryData<CartRead>(cartQueryKey, {
          ...previous,
          items: (previous.items ?? []).map((item) =>
            item.id === itemId ? { ...item, quantity } : item,
          ),
        })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cartQueryKey, context.previous)
      }
    },
    onSettled: () => {
      // Always refetch to converge on server truth (covers price_snapshot
      // refresh + cap re-application + any other server-side derivation).
      queryClient.invalidateQueries({ queryKey: cartQueryKey })
    },
  })
}

interface RemoveCartItemInput {
  itemId: number
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["cart", "remove"] as const,
    mutationFn: async ({ itemId }: RemoveCartItemInput): Promise<void> => {
      await apiClient.DELETE(
        "/api/v1/cart/items/{item_id}" as never,
        {
          params: { path: { item_id: itemId } },
        } as never,
      )
    },
    onMutate: async ({ itemId }) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey })
      const previous = queryClient.getQueryData<CartRead>(cartQueryKey)
      if (previous) {
        queryClient.setQueryData<CartRead>(cartQueryKey, {
          ...previous,
          items: (previous.items ?? []).filter((item) => item.id !== itemId),
        })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cartQueryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKey })
    },
  })
}

export function useClearCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["cart", "clear"] as const,
    mutationFn: async (): Promise<CartRead> => {
      const response = await apiClient.POST("/api/v1/cart/clear" as never)
      return (response as { data: CartRead }).data
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartQueryKey, cart)
    },
  })
}
