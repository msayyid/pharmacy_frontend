"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/lib/api/client"
import { cartQueryKey } from "@/lib/cart/queries"
import { trace } from "@/lib/observability/trace"
import type { CancelOrderRequest, OrderRead, ReorderResponse } from "@/lib/api/types"

import { orderQueryKey } from "./queries"

// Order mutations — Phase 10D (cancel) + 10E (reorder).
//
// OP-13 contract: mutation paths MUST throw loudly. Both helpers let
// ApiError propagate so consumers branch on `error` and surface a
// localized toast / inline message via t(`error.${code}`) with
// `error.generic` fallback. The catch-and-empty pattern from
// lib/api/catalog.ts is FORBIDDEN here.

interface CancelOrderInput {
  orderNumber: string
  reason?: string | null
}

/**
 * POST /api/v1/me/orders/{order_number}/cancel.
 *
 * On success the response IS the freshly-mutated OrderRead with the
 * appended status_history row + flipped status + cancelled_at. We
 * write it directly into the order cache via setQueryData so the
 * StatusTimeline updates instantly without a round-trip.
 *
 * onSettled invalidates the orders LIST so /[locale]/orders reflects
 * the new status when the user navigates back.
 *
 * Customer-cancellable only in `pending | confirmed` (backend
 * enforces; `order_not_cancellable_by_customer` otherwise). The
 * <CancelOrderButton> already gates the surface — the backend reject
 * is the safety net.
 */
export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["order", "cancel"] as const,
    mutationFn: async ({ orderNumber, reason }: CancelOrderInput): Promise<OrderRead> => {
      trace({
        category: "order.cancel",
        message: "cancel_request_sent",
        data: { order_number: orderNumber, has_reason: Boolean(reason) },
      })
      const body: CancelOrderRequest = { reason: reason ?? null }
      const response = await apiClient.POST(
        "/api/v1/me/orders/{order_number}/cancel" as never,
        {
          params: { path: { order_number: orderNumber } },
          body,
        } as never,
      )
      const data = (response as { data?: OrderRead }).data
      if (!data) {
        throw new Error("cancel_order_response_missing_data")
      }
      trace({
        category: "order.cancel",
        message: "cancel_response_ok",
        data: { order_number: orderNumber, status: data.status },
      })
      return data
    },
    onSuccess: (order, { orderNumber }) => {
      // Splice the fresh order into the detail cache — the timeline
      // re-renders with the new status + history without a refetch.
      queryClient.setQueryData(orderQueryKey(orderNumber), order)
    },
    onSettled: () => {
      // The list page's status pip reflects the canceled state on
      // next visit; invalidating triggers a refetch when the user
      // navigates back.
      queryClient.invalidateQueries({ queryKey: ["orders", "list"] })
    },
  })
}

interface ReorderInput {
  orderNumber: string
}

/**
 * POST /api/v1/me/orders/{order_number}/reorder.
 *
 * Backend adds in-stock items to the user's current cart (creating
 * one if needed) and returns annotated `lines[]` per product —
 * `added | out_of_stock | price_changed | product_deleted |
 * max_per_order_capped`. Consumer (the <ReorderButton>) inspects
 * the lines to pick the success-toast shape (full vs partial).
 *
 * **Order matters** (mirrors Phase 8 D12 R-C echo):
 *   1. POST /reorder
 *   2. queryClient.invalidateQueries(cartQueryKey)
 *   3. emit toast (consumer concern)
 *   4. router.push("/cart")
 *
 * Steps 2 must complete before step 4 so the destination /cart
 * renders the merged cart on first paint, no flash. The hook
 * handles 1 + 2; the consumer button handles 3 + 4 inside its
 * onSuccess callback.
 */
export function useReorder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["order", "reorder"] as const,
    mutationFn: async ({ orderNumber }: ReorderInput): Promise<ReorderResponse> => {
      trace({
        category: "order.reorder",
        message: "reorder_request_sent",
        data: { order_number: orderNumber },
      })
      const response = await apiClient.POST(
        "/api/v1/me/orders/{order_number}/reorder" as never,
        {
          params: { path: { order_number: orderNumber } },
        } as never,
      )
      const data = (response as { data?: ReorderResponse }).data
      if (!data) {
        throw new Error("reorder_response_missing_data")
      }
      const added = data.lines.filter((l) => l.added_to_cart).length
      trace({
        category: "order.reorder",
        message: "reorder_response_ok",
        data: { order_number: orderNumber, added, total: data.lines.length },
      })
      return data
    },
    onSuccess: async () => {
      // Invalidate BEFORE the consumer pushes to /cart so the
      // destination renders the merged cart immediately.
      await queryClient.invalidateQueries({ queryKey: cartQueryKey })
    },
  })
}

/**
 * Toast-shape helper consumers use to pick the right copy after a
 * successful reorder. `full` when every line landed; `partial` when
 * some did and some didn't; `empty` when the response added zero
 * lines (all OOS / deleted / capped).
 */
export type ReorderOutcome = "full" | "partial" | "empty"

export function classifyReorder(response: ReorderResponse): {
  outcome: ReorderOutcome
  added: number
  total: number
} {
  const total = response.lines.length
  const added = response.lines.filter((l) => l.added_to_cart).length
  const outcome: ReorderOutcome = added === 0 ? "empty" : added === total ? "full" : "partial"
  return { outcome, added, total }
}
