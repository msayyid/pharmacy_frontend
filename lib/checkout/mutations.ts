"use client"

import { useMutation } from "@tanstack/react-query"
import * as React from "react"

import { apiClient } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import type { PlaceOrderRequest, PlaceOrderResponse } from "@/lib/api/types"
import { trace } from "@/lib/observability/trace"

// Idempotency-Key lifecycle for POST /api/v1/checkout/place.
//
// Per FRONTEND §6.3 + Phase 9 plan D4 + the user's vigilance directive:
//   1. Generate a UUID v4 ONCE on form mount.
//   2. Reuse on every retry of the same submission attempt.
//   3. Mint new ONLY when:
//      a) Component remounts (natural lifecycle — useState initializer
//         fires once, gives a new key on fresh mount).
//      b) `idempotency_conflict` (409) comes back AND the auto-retry path
//         hasn't already fired (we mint new + retry ONCE max, then stop).
//      c) Cart edits after a `checkout_conflict` — caller invokes
//         `mintNewKey()` explicitly when the cart hash changes.
//   4. Profile/recipient/notes/payment edits within the same attempt
//      KEEP the same key. Body-digest divergence is handled by the
//      auto-retry path.
//
// Every mint, reuse, and conflict logs a Sentry breadcrumb (stubbed via
// lib/observability/trace until Phase 11 wires the SDK). Idempotency
// bugs are the hardest class to debug post-incident; the breadcrumb
// investment is intentional.

const IDEMPOTENCY_BREADCRUMB_CATEGORY = "checkout.idempotency"

interface IdempotencyKeyState {
  key: string
  mintCount: number
  /** True after a 409 idempotency_conflict has triggered an auto-mint
   *  retry. Set back to false on a fresh mintNewKey() (cart edit). */
  autoRetryFired: boolean
}

export interface UseIdempotencyKey {
  key: string
  mintCount: number
  mintNewKey: () => string
  resetAutoRetry: () => void
  /** Internal — used by usePlaceOrder to gate the one-retry-max rule.
   *  Returns the new key if a retry is permitted, null if already used. */
  consumeAutoRetry: () => string | null
}

export function useIdempotencyKey(): UseIdempotencyKey {
  // useState initializer runs ONCE per mount — natural lifecycle for
  // condition 3a (component remount = new key).
  const [state, setState] = React.useState<IdempotencyKeyState>(() => {
    const key = crypto.randomUUID()
    trace({
      category: IDEMPOTENCY_BREADCRUMB_CATEGORY,
      message: "key_minted_on_mount",
      data: { key, mintCount: 1 },
    })
    return { key, mintCount: 1, autoRetryFired: false }
  })

  const mintNewKey = React.useCallback((): string => {
    const next = crypto.randomUUID()
    setState((prev) => ({
      key: next,
      mintCount: prev.mintCount + 1,
      autoRetryFired: false,
    }))
    trace({
      category: IDEMPOTENCY_BREADCRUMB_CATEGORY,
      message: "key_minted_on_request",
      data: { previousKey: state.key, newKey: next, mintCount: state.mintCount + 1 },
    })
    return next
  }, [state.key, state.mintCount])

  const consumeAutoRetry = React.useCallback((): string | null => {
    if (state.autoRetryFired) {
      trace({
        category: IDEMPOTENCY_BREADCRUMB_CATEGORY,
        message: "auto_retry_refused_already_fired",
        data: { key: state.key, mintCount: state.mintCount },
        level: "warning",
      })
      return null
    }
    const next = crypto.randomUUID()
    setState((prev) => ({
      key: next,
      mintCount: prev.mintCount + 1,
      autoRetryFired: true,
    }))
    trace({
      category: IDEMPOTENCY_BREADCRUMB_CATEGORY,
      message: "key_minted_on_idempotency_conflict_auto_retry",
      data: { previousKey: state.key, newKey: next, mintCount: state.mintCount + 1 },
      level: "warning",
    })
    return next
  }, [state.autoRetryFired, state.key, state.mintCount])

  const resetAutoRetry = React.useCallback(() => {
    setState((prev) => ({ ...prev, autoRetryFired: false }))
  }, [])

  return {
    key: state.key,
    mintCount: state.mintCount,
    mintNewKey,
    resetAutoRetry,
    consumeAutoRetry,
  }
}

// usePlaceOrder — POST /api/v1/checkout/place with the X-Idempotency-Key
// header. Auth required (CurrentUser dep on the backend route).
//
// Per CLAUDE.md OP-13 + Phase 9 plan D15: place-order failure must NEVER
// swallow silently. ApiError propagates to the caller's onError, which
// branches on error.code per the locked sequence below.
//
// ORDER MATTERS — do not refactor without reading DECISION_LOG D11
// (lands at Phase 9 close). The conflict-resolution sequence in the
// CheckoutForm consumer:
//   1. usePlaceOrder fires with current Idempotency-Key.
//   2. on 409 checkout_conflict: refetch quote, surface ConflictBanner,
//      disable Place button. KEEP the same key.
//   3. on 409 idempotency_conflict: auto-mint (consumeAutoRetry) +
//      retry ONCE. If the retry also 409s, surface a critical toast and
//      stop. NO loop.
//   4. on 422 cart_empty / cart_expired: redirect to /cart, mint new key
//      on next checkout entry (handled by component remount).
//   5. on 200/201: branch on payment_redirect_url (window.location.assign)
//      vs router.replace to /orders/[number]. Replay 201 from cache
//      treats identically to fresh 201.
// Reordering or short-circuiting these branches breaks idempotency or
// order-placement integrity.

export interface UsePlaceOrderInput {
  body: PlaceOrderRequest
  idempotencyKey: string
}

export function usePlaceOrder() {
  return useMutation({
    mutationKey: ["checkout", "place"] as const,
    mutationFn: async ({
      body,
      idempotencyKey,
    }: UsePlaceOrderInput): Promise<PlaceOrderResponse> => {
      trace({
        category: IDEMPOTENCY_BREADCRUMB_CATEGORY,
        message: "place_order_request_sent",
        data: { idempotencyKey },
      })
      const response = await apiClient.POST(
        "/api/v1/checkout/place" as never,
        {
          body,
          headers: { "Idempotency-Key": idempotencyKey },
        } as never,
      )
      const data = (response as { data?: PlaceOrderResponse }).data
      if (!data) {
        // OP-13: place-order silent failure is the worst class of bug.
        // Fail loud with an explicit ApiError instead of returning empty.
        throw new ApiError({
          code: "place_order_response_missing_data",
          status: 0,
          context: {},
        })
      }
      trace({
        category: IDEMPOTENCY_BREADCRUMB_CATEGORY,
        message: "place_order_response_ok",
        data: {
          idempotencyKey,
          orderNumber: data.order_number,
          paymentRedirect: Boolean(data.payment_redirect_url),
        },
      })
      return data
    },
  })
}
