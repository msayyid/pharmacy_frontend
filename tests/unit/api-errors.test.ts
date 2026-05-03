import { describe, expect, it } from "vitest"

import { ApiError, parseApiError } from "@/lib/api/errors"

function makeResponse(body: string | null, init: ResponseInit & { requestId?: string } = {}) {
  const headers = new Headers(init.headers ?? {})
  if (init.requestId) headers.set("x-request-id", init.requestId)
  return new Response(body, { ...init, headers })
}

describe("ApiError", () => {
  it("preserves code, status, context, requestId opaquely", () => {
    const err = new ApiError({
      code: "out_of_stock",
      status: 409,
      context: { product_id: "abc-123" },
      requestId: "req-xyz",
    })
    expect(err.code).toBe("out_of_stock")
    expect(err.status).toBe(409)
    expect(err.context).toEqual({ product_id: "abc-123" })
    expect(err.requestId).toBe("req-xyz")
    expect(err.name).toBe("ApiError")
    expect(err.message).toBe("[409] out_of_stock")
  })

  it("accepts code without context (defaults to {})", () => {
    const err = new ApiError({ code: "not_found", status: 404 })
    expect(err.context).toEqual({})
    expect(err.requestId).toBeUndefined()
    expect(err.errors).toBeUndefined()
  })

  it("is throwable + identifiable via instanceof", () => {
    const err = new ApiError({ code: "rate_limited", status: 429 })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
    expect(() => {
      throw err
    }).toThrow(ApiError)
  })
})

describe("parseApiError", () => {
  it("parses a 404 ProblemDetails body", async () => {
    const body = JSON.stringify({
      type: "about:blank#category_not_found",
      title: "Not found",
      status: 404,
      code: "category_not_found",
      detail: "Category 'aspirin' was not found",
    })
    const err = await parseApiError(makeResponse(body, { status: 404 }))
    expect(err.code).toBe("category_not_found")
    expect(err.status).toBe(404)
  })

  it("parses a 409 ProblemDetails with context", async () => {
    const body = JSON.stringify({
      type: "about:blank#out_of_stock",
      title: "Out of stock",
      status: 409,
      code: "out_of_stock",
      context: {
        cart_item_id: 42,
        product_id: "prod-uuid",
        requested_quantity: 5,
        available_quantity: 2,
      },
    })
    const err = await parseApiError(makeResponse(body, { status: 409 }))
    expect(err.code).toBe("out_of_stock")
    expect(err.status).toBe(409)
    expect(err.context).toEqual({
      cart_item_id: 42,
      product_id: "prod-uuid",
      requested_quantity: 5,
      available_quantity: 2,
    })
  })

  it("parses a 422 RequestValidationError with errors array", async () => {
    const body = JSON.stringify({
      type: "about:blank#validation_error",
      title: "Invalid request",
      status: 422,
      code: "validation_error",
      errors: [
        { loc: ["body", "phone"], msg: "Field required", type: "missing" },
        {
          loc: ["body", "code"],
          msg: "ensure this value has at least 4 characters",
          type: "value_error.any_str.min_length",
          ctx: { limit_value: "4" },
        },
      ],
    })
    const err = await parseApiError(makeResponse(body, { status: 422 }))
    expect(err.code).toBe("validation_error")
    expect(err.status).toBe(422)
    expect(err.errors).toHaveLength(2)
    expect(err.errors?.[0]).toEqual({
      loc: ["body", "phone"],
      msg: "Field required",
      type: "missing",
    })
    expect(err.errors?.[1]?.ctx).toEqual({ limit_value: "4" })
  })

  it("captures the X-Request-ID echo header for trace correlation", async () => {
    const body = JSON.stringify({ code: "rate_limited", status: 429 })
    const err = await parseApiError(makeResponse(body, { status: 429, requestId: "req-abc-123" }))
    expect(err.requestId).toBe("req-abc-123")
  })

  it("falls back to unknown_error on malformed JSON body", async () => {
    const err = await parseApiError(makeResponse("<html>502 bad gateway</html>", { status: 502 }))
    expect(err.code).toBe("unknown_error")
    expect(err.status).toBe(502)
    expect(err.context).toEqual({})
    expect(err.errors).toBeUndefined()
  })

  it("falls back when body is empty", async () => {
    const err = await parseApiError(makeResponse(null, { status: 504 }))
    expect(err.code).toBe("unknown_error")
    expect(err.status).toBe(504)
  })

  it("falls back when body parses as JSON but lacks ProblemDetails fields", async () => {
    const body = JSON.stringify({ unrelated: true })
    const err = await parseApiError(makeResponse(body, { status: 500 }))
    expect(err.code).toBe("unknown_error")
    expect(err.status).toBe(500)
  })

  it("preserves HTTP status when body's status field is absent", async () => {
    const body = JSON.stringify({ code: "checkout_conflict" })
    const err = await parseApiError(makeResponse(body, { status: 409 }))
    expect(err.code).toBe("checkout_conflict")
    expect(err.status).toBe(409)
  })

  it("does not enumerate the 70+ error codes — code is a plain string", async () => {
    // Phase 3 mantra: ApiError preserves the code field opaquely. Any string
    // the backend emits passes through unchanged. Phase 4 maps these to i18n
    // keys via t(`error.${code}`).
    const exotic = "phantom_pharmacist_error_xyz"
    const body = JSON.stringify({ code: exotic, status: 418 })
    const err = await parseApiError(makeResponse(body, { status: 418 }))
    expect(err.code).toBe(exotic)
  })
})
