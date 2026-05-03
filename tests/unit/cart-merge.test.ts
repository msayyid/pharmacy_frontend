import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/errors"
import { mergeGuestCartIntoUser } from "@/lib/cart/merge"

// Tiny apiClient mock — the only method merge calls is `POST`. Tests inject
// canned responses or thrown ApiErrors per case.
function makeMockClient(responses: ReadonlyArray<unknown>) {
  let callIndex = 0
  return {
    POST: vi.fn(async () => {
      const response = responses[callIndex]
      callIndex += 1
      if (response instanceof Error) throw response
      return response
    }),
  } as never
}

describe("mergeGuestCartIntoUser", () => {
  it("empty guest cart is a no-op (zero attempts)", async () => {
    const client = makeMockClient([])
    const result = await mergeGuestCartIntoUser({ guestItems: [], client })
    expect(result).toEqual({ attempted: 0, added: 0, failed: [] })
    expect(
      (client as unknown as { POST: { mock: { calls: unknown[] } } }).POST.mock.calls,
    ).toHaveLength(0)
  })

  it("re-adds each item in sequence", async () => {
    const client = makeMockClient([{ data: { id: 1 } }, { data: { id: 2 } }, { data: { id: 3 } }])
    const result = await mergeGuestCartIntoUser({
      guestItems: [
        { product_id: "prod-a", quantity: 2 },
        { product_id: "prod-b", quantity: 1 },
        { product_id: "prod-c", quantity: 5 },
      ],
      client,
    })
    expect(result).toEqual({ attempted: 3, added: 3, failed: [] })
    expect(
      (client as unknown as { POST: { mock: { calls: unknown[] } } }).POST.mock.calls,
    ).toHaveLength(3)
  })

  it("partial failure: out_of_stock on one item; others succeed", async () => {
    const oosError = new ApiError({
      code: "out_of_stock",
      status: 409,
      context: { product_id: "prod-b", available_quantity: 0 },
    })
    const client = makeMockClient([{ data: { id: 1 } }, oosError, { data: { id: 3 } }])
    const result = await mergeGuestCartIntoUser({
      guestItems: [
        { product_id: "prod-a", quantity: 2 },
        { product_id: "prod-b", quantity: 1 },
        { product_id: "prod-c", quantity: 5 },
      ],
      client,
    })
    expect(result.attempted).toBe(3)
    expect(result.added).toBe(2)
    expect(result.failed).toEqual([
      { product_id: "prod-b", quantity: 1, code: "out_of_stock", status: 409 },
    ])
  })

  it("non-ApiError exceptions surface as unknown_error/status:0", async () => {
    const networkError = new Error("Network failure")
    const client = makeMockClient([networkError])
    const result = await mergeGuestCartIntoUser({
      guestItems: [{ product_id: "prod-x", quantity: 1 }],
      client,
    })
    expect(result.failed).toEqual([
      { product_id: "prod-x", quantity: 1, code: "unknown_error", status: 0 },
    ])
  })

  it("never blocks login — even when ALL items fail, returns gracefully", async () => {
    const reject = new ApiError({ code: "product_not_found", status: 404 })
    const client = makeMockClient([reject, reject, reject])
    const result = await mergeGuestCartIntoUser({
      guestItems: [
        { product_id: "p1", quantity: 1 },
        { product_id: "p2", quantity: 1 },
        { product_id: "p3", quantity: 1 },
      ],
      client,
    })
    expect(result.added).toBe(0)
    expect(result.failed).toHaveLength(3)
  })
})
