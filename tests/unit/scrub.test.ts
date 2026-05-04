import { describe, expect, it } from "vitest"

import { scrubPii } from "@/lib/observability/scrub"

// Phase 11D — PII scrubber for Sentry beforeSend / breadcrumb data.
// Sacred-invariant #8 (no PII logged client-side).

describe("scrubPii — top-level fields", () => {
  it("redacts known PII keys at the root", () => {
    const out = scrubPii({
      productId: "abc",
      phone: "+996 700 12 34 56",
      email: "user@example.com",
      address: "мкр Асанбай, дом 12",
    }) as Record<string, unknown>
    expect(out["productId"]).toBe("abc")
    expect(out["phone"]).toBe("[redacted]")
    expect(out["email"]).toBe("[redacted]")
    expect(out["address"]).toBe("[redacted]")
  })

  it("redacts auth-shaped fields (token, access_token, refresh_token, password)", () => {
    const out = scrubPii({
      token: "abc",
      access_token: "def",
      refresh_token: "ghi",
      password: "p4ss",
      keep_me: "untouched",
    }) as Record<string, unknown>
    expect(out["token"]).toBe("[redacted]")
    expect(out["access_token"]).toBe("[redacted]")
    expect(out["refresh_token"]).toBe("[redacted]")
    expect(out["password"]).toBe("[redacted]")
    expect(out["keep_me"]).toBe("untouched")
  })
})

describe("scrubPii — nested + array shapes", () => {
  it("redacts PII inside nested objects", () => {
    const out = scrubPii({
      order: { recipient_name: "Иван Петров", recipient_phone: "+996700123456", id: "PH-1" },
    }) as { order: Record<string, unknown> }
    expect(out.order["recipient_name"]).toBe("[redacted]")
    expect(out.order["recipient_phone"]).toBe("[redacted]")
    expect(out.order["id"]).toBe("PH-1")
  })

  it("redacts PII inside arrays", () => {
    const out = scrubPii({
      lines: [
        { product_id: "p1", recipient_phone: "+996700123456" },
        { product_id: "p2", recipient_phone: "+996700987654" },
      ],
    }) as { lines: Array<Record<string, unknown>> }
    expect(out.lines[0]?.["recipient_phone"]).toBe("[redacted]")
    expect(out.lines[0]?.["product_id"]).toBe("p1")
    expect(out.lines[1]?.["recipient_phone"]).toBe("[redacted]")
  })
})

describe("scrubPii — preserves non-PII data", () => {
  it("does not corrupt order numbers, SKUs, or product fields", () => {
    const out = scrubPii({
      order_number: "PH-2026-12345",
      sku: "PAR-500-12",
      product_name: "Парацетамол 500мг 12 таб",
      price: "120.00",
      currency: "KGS",
    }) as Record<string, unknown>
    expect(out["order_number"]).toBe("PH-2026-12345")
    expect(out["sku"]).toBe("PAR-500-12")
    expect(out["product_name"]).toBe("Парацетамол 500мг 12 таб")
  })

  it("returns primitives unchanged", () => {
    expect(scrubPii(null)).toBeNull()
    expect(scrubPii(undefined)).toBeUndefined()
    expect(scrubPii(42)).toBe(42)
    expect(scrubPii("string")).toBe("string")
    expect(scrubPii(true)).toBe(true)
  })
})

describe("scrubPii — defensive against cycles", () => {
  it("does not infinite-loop on self-referential objects", () => {
    const obj: Record<string, unknown> = { id: "x" }
    obj["self"] = obj
    expect(() => scrubPii(obj)).not.toThrow()
  })
})
