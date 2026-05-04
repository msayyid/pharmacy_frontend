import { describe, expect, it } from "vitest"

import { expectedSequence, isCustomerCancellable, isTerminal } from "@/lib/orders/lifecycle"

// Phase 10A — pure-function predicates that drive the StatusTimeline,
// CancelOrderButton gating, and useOrder polling cadence (Q-12). The
// truth here is the backend state machine documented in CLAUDE.md +
// app/domain/orders/lifecycle.py — these tests pin the contract.

describe("isTerminal", () => {
  it.each(["delivered", "cancelled", "refunded"] as const)(
    "returns true for terminal state %s",
    (status) => {
      expect(isTerminal(status)).toBe(true)
    },
  )

  it.each(["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"] as const)(
    "returns false for non-terminal state %s",
    (status) => {
      expect(isTerminal(status)).toBe(false)
    },
  )

  it("returns false for null / undefined / empty (defensive)", () => {
    expect(isTerminal(null)).toBe(false)
    expect(isTerminal(undefined)).toBe(false)
    expect(isTerminal("")).toBe(false)
  })

  it("returns false for an unknown status string", () => {
    // We don't want a typo or a future backend state to accidentally
    // trigger terminal-state UX (poll stop, hide cancel CTA, etc.).
    expect(isTerminal("on_hold")).toBe(false)
  })
})

describe("isCustomerCancellable", () => {
  it.each(["pending", "confirmed"] as const)("returns true for cancellable state %s", (status) => {
    expect(isCustomerCancellable(status)).toBe(true)
  })

  it.each([
    "preparing",
    "ready_for_pickup",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "refunded",
  ] as const)("returns false for non-cancellable state %s", (status) => {
    expect(isCustomerCancellable(status)).toBe(false)
  })

  it("returns false for null / undefined / empty", () => {
    expect(isCustomerCancellable(null)).toBe(false)
    expect(isCustomerCancellable(undefined)).toBe(false)
    expect(isCustomerCancellable("")).toBe(false)
  })
})

describe("expectedSequence", () => {
  it("returns the delivery sequence ending in delivered", () => {
    expect(expectedSequence("delivery")).toEqual([
      "pending",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "delivered",
    ])
  })

  it("returns the pickup sequence ending in delivered", () => {
    expect(expectedSequence("pickup")).toEqual([
      "pending",
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "delivered",
    ])
  })

  it("falls back to the delivery sequence for unknown / null / undefined", () => {
    expect(expectedSequence(null)).toEqual(expectedSequence("delivery"))
    expect(expectedSequence(undefined)).toEqual(expectedSequence("delivery"))
    expect(expectedSequence("teleport")).toEqual(expectedSequence("delivery"))
  })

  it("never includes terminal interrupts (cancelled / refunded)", () => {
    // The timeline collapses these into a single muted row; they do
    // NOT belong on the spine.
    for (const method of ["delivery", "pickup"] as const) {
      const seq = expectedSequence(method)
      expect(seq).not.toContain("cancelled")
      expect(seq).not.toContain("refunded")
    }
  })
})
