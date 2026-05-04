import { describe, expect, it } from "vitest"

import { classifyReorder } from "@/lib/orders/mutations"
import type { ReorderResponse, ReorderResponseLine } from "@/lib/api/types"

// Phase 10E — toast-shape decision lives in classifyReorder. The
// <ReorderButton> reads the outcome and picks the right copy from
// `order.reorder.success.{full,partial,empty}`.
//
// Backend contract (verified against app/domain/orders/order_service.py):
//   reason ∈ "added" | "out_of_stock" | "price_changed" | "product_deleted" | "max_per_order_capped"
//   added_to_cart: bool — true iff the line was added (only "added" lines)
// The price-changed case is interesting: backend annotates the line
// but DOES add it (so added_to_cart=true with reason="price_changed")
// per service code reading. We classify by added_to_cart alone, not
// by reason — this matches what the customer cares about.

const cartId = "00000000-0000-0000-0000-000000000001"

function line(
  added: boolean,
  reason: ReorderResponseLine["reason"],
  name = "Парацетамол 500мг 12 таб",
): ReorderResponseLine {
  return {
    product_id: null,
    product_name_snapshot: name,
    product_sku_snapshot: "PAR-500-12",
    quantity_requested: 1,
    added_to_cart: added,
    reason,
    snapshot_price: null,
    current_price: null,
  }
}

describe("classifyReorder", () => {
  it("outcome=full when every line landed", () => {
    const response: ReorderResponse = {
      cart_id: cartId,
      lines: [line(true, "added"), line(true, "added"), line(true, "added")],
    }
    expect(classifyReorder(response)).toEqual({ outcome: "full", added: 3, total: 3 })
  })

  it("outcome=partial when some added and some failed", () => {
    const response: ReorderResponse = {
      cart_id: cartId,
      lines: [line(true, "added"), line(false, "out_of_stock"), line(true, "price_changed")],
    }
    expect(classifyReorder(response)).toEqual({ outcome: "partial", added: 2, total: 3 })
  })

  it("outcome=empty when zero lines added", () => {
    const response: ReorderResponse = {
      cart_id: cartId,
      lines: [
        line(false, "out_of_stock"),
        line(false, "product_deleted"),
        line(false, "max_per_order_capped"),
      ],
    }
    expect(classifyReorder(response)).toEqual({ outcome: "empty", added: 0, total: 3 })
  })

  it("outcome=empty when the response has zero lines (degenerate but real)", () => {
    const response: ReorderResponse = { cart_id: cartId, lines: [] }
    expect(classifyReorder(response)).toEqual({ outcome: "empty", added: 0, total: 0 })
  })

  it("classifies by added_to_cart alone, not by reason", () => {
    // A price_changed line is annotated but DOES land in the cart;
    // we treat it as a successful add.
    const response: ReorderResponse = {
      cart_id: cartId,
      lines: [line(true, "price_changed")],
    }
    expect(classifyReorder(response)).toEqual({ outcome: "full", added: 1, total: 1 })
  })
})
