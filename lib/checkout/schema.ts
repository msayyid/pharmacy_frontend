import { z } from "zod"

import { isValidPhone } from "@/lib/format/phone"

// Checkout form schema — Zod with structural refinements that don't
// depend on cart state (cart-aware refinements like cold-chain blocking
// and COD-over-10k live in the CheckoutForm component, evaluated against
// the live quote response).
//
// Backend's PlaceOrderRequest accepts seven payment_method values per
// the OpenAPI enum. We hardcode `cash_on_delivery` here per Phase 0 Q-2
// and Phase 9 plan D6. The radio component duplicates this list; both
// are deliberate — surfacing card_online without the Freedom Pay
// integration (Q14) would land customers on a broken redirect.
//
// Address mutex (delivery_method = "delivery"): backend does NOT enforce
// "exactly one of address_id / address". The Zod refinement below makes
// the contract explicit on the FE side per Phase 9 research finding G.8.

export const PlaceOrderAddressSchema = z.object({
  city: z.string().min(1).max(80),
  address_line: z.string().min(1).max(2000),
  landmark: z.string().max(160).optional().or(z.literal("")),
  apartment: z.string().max(40).optional().or(z.literal("")),
  floor: z.string().max(20).optional().or(z.literal("")),
  entrance: z.string().max(20).optional().or(z.literal("")),
  intercom_code: z.string().max(40).optional().or(z.literal("")),
  delivery_notes: z.string().max(2000).optional().or(z.literal("")),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export type PlaceOrderAddressFormValues = z.infer<typeof PlaceOrderAddressSchema>

export const CheckoutSchema = z
  .object({
    delivery_method: z.enum(["delivery", "pickup"]),
    payment_method: z.literal("cash_on_delivery"),
    recipient_name: z.string().min(1, { message: "error.phone_required" }).max(160),
    recipient_phone: z
      .string()
      .min(1, { message: "error.phone_required" })
      .max(20)
      .refine((v) => isValidPhone(v), { message: "error.invalid_phone" }),
    customer_notes: z.string().max(2000).optional().or(z.literal("")),
    address_id: z.number().int().positive().optional(),
    address: PlaceOrderAddressSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.delivery_method !== "delivery") return
    const hasId = data.address_id !== undefined
    const hasInline = data.address !== undefined
    if (!hasId && !hasInline) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address_id"],
        message: "error.address_required_for_delivery",
      })
    }
    if (hasId && hasInline) {
      // Backend silently prefers inline; we surface this as a form
      // error so the user picks one explicitly. Should not be
      // user-reachable in normal UI flow (radio mutex + inline form).
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address_id"],
        message: "error.address_required_for_delivery",
      })
    }
  })

export type CheckoutFormValues = z.infer<typeof CheckoutSchema>
