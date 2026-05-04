import { describe, expect, it } from "vitest"

import { CheckoutSchema } from "@/lib/checkout/schema"

// CheckoutSchema regression — the address-mutex superRefine and the
// hardcoded payment_method literal are the two contracts that protect
// the form's structural validity. Backend's PlaceOrderRequest accepts
// any payment_method enum value and silently picks `address` over
// `address_id` if both are sent — the schema makes BOTH explicit on
// the FE side.

const validBase = {
  payment_method: "cash_on_delivery" as const,
  recipient_name: "Айбек Турдиев",
  recipient_phone: "+996 700 12 34 56",
  customer_notes: "",
}

describe("CheckoutSchema", () => {
  it("accepts pickup with no address_id / address", () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      delivery_method: "pickup",
    })
    expect(result.success).toBe(true)
  })

  it("accepts delivery with address_id only", () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      delivery_method: "delivery",
      address_id: 7,
    })
    expect(result.success).toBe(true)
  })

  it("accepts delivery with inline address only", () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      delivery_method: "delivery",
      address: {
        city: "Бишкек",
        address_line: "мкр Асанбай, дом 12",
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects delivery with neither address_id nor inline address", () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      delivery_method: "delivery",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "address_id")
      expect(issue?.message).toBe("error.address_required_for_delivery")
    }
  })

  it("rejects delivery with BOTH address_id AND inline address (mutex)", () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      delivery_method: "delivery",
      address_id: 7,
      address: {
        city: "Бишкек",
        address_line: "мкр Асанбай, дом 12",
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects payment_method values other than cash_on_delivery (regression guard)", () => {
    // Schema is `z.literal("cash_on_delivery")` per the COD-only contract.
    // If a future change widens it (to add card_online when Q14 lands),
    // this test fails on purpose so the migration is explicit.
    const result = CheckoutSchema.safeParse({
      ...validBase,
      payment_method: "card_online",
      delivery_method: "pickup",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid phone format", () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      recipient_phone: "not-a-phone",
      delivery_method: "pickup",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "recipient_phone")
      expect(issue?.message).toBe("error.invalid_phone")
    }
  })
})
