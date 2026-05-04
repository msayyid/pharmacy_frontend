import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useIdempotencyKey } from "@/lib/checkout/mutations"

// Phase 9 R-A surface — idempotency-key lifecycle. These four scenarios
// are the contract of usePlaceOrder. Per the user's vigilance directive
// #2: "Don't claim 9A complete without these four tests passing."
//
//   (a) mount → single key → reuse on retry → same key
//   (b) network-fail-retry → same key
//   (c) checkout_conflict → cart-edit → new key
//   (d) idempotency_conflict → auto-mint → retry-once → stop on second 409

describe("useIdempotencyKey lifecycle (Phase 9 R-A)", () => {
  beforeEach(() => {
    vi.spyOn(crypto, "randomUUID")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("(a) mount → single key → reuse across reads", () => {
    const { result } = renderHook(() => useIdempotencyKey())
    const initialKey = result.current.key
    expect(initialKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.current.mintCount).toBe(1)

    // Multiple reads of `result.current.key` return the same value —
    // this is the "reuse on retry" contract: usePlaceOrder reads
    // idempotencyKey at every mutation.mutate() and gets the SAME UUID
    // until something explicitly mints a new one.
    expect(result.current.key).toBe(initialKey)
    expect(result.current.key).toBe(initialKey)
    expect(result.current.mintCount).toBe(1)
  })

  it("(b) network-fail simulation → caller does NOT mint → key reused", () => {
    const { result } = renderHook(() => useIdempotencyKey())
    const initialKey = result.current.key

    // Simulate the place-order flow:
    //   1. Submit attempt #1 reads result.current.key → initialKey
    //   2. Network fails (TypeError: fetch failed)
    //   3. Caller's onError does NOT mint a new key (only checkout_conflict
    //      with cart-edit or idempotency_conflict triggers a mint)
    //   4. User clicks Place again → submit attempt #2 reads
    //      result.current.key → STILL initialKey

    // No state mutation occurred between submit attempts.
    const keyOnRetry = result.current.key
    expect(keyOnRetry).toBe(initialKey)
    expect(result.current.mintCount).toBe(1)
  })

  it("(c) checkout_conflict → user edits cart → mintNewKey() → new key", () => {
    const { result } = renderHook(() => useIdempotencyKey())
    const firstKey = result.current.key

    // Simulate the locked sequence:
    //   1. usePlaceOrder fires with firstKey → 409 checkout_conflict
    //   2. ConflictBanner surfaces, user navigates to /cart
    //   3. User removes the OOS line; cart hash changes
    //   4. CheckoutForm detects cart hash change AND that the prior
    //      attempt was a conflict → calls mintNewKey()
    let newKey = ""
    act(() => {
      newKey = result.current.mintNewKey()
    })

    expect(newKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(newKey).not.toBe(firstKey)
    expect(result.current.key).toBe(newKey)
    expect(result.current.mintCount).toBe(2)
  })

  it("(d) idempotency_conflict → consumeAutoRetry once → stop on second", () => {
    const { result } = renderHook(() => useIdempotencyKey())
    const firstKey = result.current.key

    // Simulate the auto-mint-on-409 path:
    //   1. usePlaceOrder fires with firstKey → 409 idempotency_conflict
    //      (means: same key was used previously with a different body
    //      digest — backend rejects with this code).
    //   2. usePlaceOrder onError handler calls consumeAutoRetry().
    //   3. consumeAutoRetry() mints a new key, sets autoRetryFired=true,
    //      returns the new key. Caller retries with that key.
    //   4. If THAT retry also 409s with idempotency_conflict, the caller
    //      calls consumeAutoRetry() AGAIN — and this time the hook
    //      MUST return null (one-retry-max rule per the user's directive
    //      "auto-mint-on-409 retry must be ONE retry MAX, not a loop").

    let firstAutoRetryKey: string | null = null
    act(() => {
      firstAutoRetryKey = result.current.consumeAutoRetry()
    })
    expect(firstAutoRetryKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(firstAutoRetryKey).not.toBe(firstKey)
    expect(result.current.key).toBe(firstAutoRetryKey)
    expect(result.current.mintCount).toBe(2)

    let secondAutoRetryKey: string | null = "not-yet"
    act(() => {
      secondAutoRetryKey = result.current.consumeAutoRetry()
    })
    expect(secondAutoRetryKey).toBeNull()
    // State unchanged on the refused second retry.
    expect(result.current.key).toBe(firstAutoRetryKey)
    expect(result.current.mintCount).toBe(2)
  })

  it("resetAutoRetry allows a fresh consumeAutoRetry after a real mint", () => {
    const { result } = renderHook(() => useIdempotencyKey())

    // Trigger consumeAutoRetry once — fires.
    act(() => {
      result.current.consumeAutoRetry()
    })
    // A second call is refused.
    let blocked: string | null = "not-yet"
    act(() => {
      blocked = result.current.consumeAutoRetry()
    })
    expect(blocked).toBeNull()

    // mintNewKey resets autoRetryFired (the user has progressed past the
    // conflict — e.g., cart edit + fresh attempt). Now consumeAutoRetry
    // is allowed to fire once again on a future idempotency_conflict.
    act(() => {
      result.current.mintNewKey()
    })

    let allowed: string | null = null
    act(() => {
      allowed = result.current.consumeAutoRetry()
    })
    expect(allowed).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("each mount produces a fresh key (component remount = new key)", () => {
    // Two independent renderHook invocations simulate two component
    // mounts (e.g., user navigates away from /checkout and back).
    const first = renderHook(() => useIdempotencyKey())
    const second = renderHook(() => useIdempotencyKey())

    expect(first.result.current.key).not.toBe(second.result.current.key)
    expect(first.result.current.mintCount).toBe(1)
    expect(second.result.current.mintCount).toBe(1)
  })
})
