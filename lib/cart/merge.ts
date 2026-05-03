import type { apiClient as BrowserApiClient } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"

// Cart-merge workaround at OTP-verify success.
//
// Per DECISION_LOG.md 2026-05-03 (Q-5 / OQ-16): backend's
// POST /api/v1/auth/otp/verify does NOT call merge_guest_into_user. Without
// FE intervention, a guest who builds a cart and logs in at the auth wall
// loses the guest cart's contents — `get_cart_owner` returns `(user, None)`
// and ignores the `pharmacy_cart_session` cookie when a Bearer is present.
//
// FE workaround: snapshot the guest cart from cache before OTP verify;
// after the user is authenticated, re-add each item via
// POST /api/v1/cart/items in sequence. Best-effort: per-item failures (out
// of stock, max-per-order capped, product deleted) surface inline but DO
// NOT block login. Loses price snapshots; preserves intent.
//
// Phase 5 wiring: the OTP page passes an empty guest-items list because
// Phase 5 doesn't have the cart UI yet. Phase 8 (Cart) will plumb the real
// cache snapshot from TanStack Query.

export interface MergeFailedItem {
  product_id: string
  quantity: number
  code: string
  status: number
}

export interface MergeResult {
  attempted: number
  added: number
  failed: MergeFailedItem[]
}

export interface GuestCartItem {
  product_id: string
  quantity: number
}

export interface MergeOptions {
  guestItems: ReadonlyArray<GuestCartItem>
  client: typeof BrowserApiClient
}

export async function mergeGuestCartIntoUser({
  guestItems,
  client,
}: MergeOptions): Promise<MergeResult> {
  const result: MergeResult = {
    attempted: guestItems.length,
    added: 0,
    failed: [],
  }

  for (const item of guestItems) {
    try {
      await client.POST(
        "/api/v1/cart/items" as never,
        {
          body: { product_id: item.product_id, quantity: item.quantity },
        } as never,
      )
      result.added += 1
    } catch (error) {
      if (error instanceof ApiError) {
        result.failed.push({
          product_id: item.product_id,
          quantity: item.quantity,
          code: error.code,
          status: error.status,
        })
      } else {
        result.failed.push({
          product_id: item.product_id,
          quantity: item.quantity,
          code: "unknown_error",
          status: 0,
        })
      }
      // Per DECISION_LOG: per-item failure NEVER blocks login. We log it
      // (the caller surfaces the result.failed list inline) and move on.
    }
  }

  return result
}
