// Order-state predicates + step-sequence helpers for Phase 10 surfaces.
//
// The customer-facing state machine (per CLAUDE.md > Domain reality
// checks > Order state machine):
//
//   pending → confirmed → preparing → (ready_for_pickup | out_for_delivery) → delivered
//                                                                                   ↓
//                                                                               refunded
//                       ↓
//                   cancelled (from any pre-delivered state)
//
// `cancelled | delivered | refunded` are terminal. The poller in
// `useOrder()` stops once the response status hits a terminal value.
// `pending | confirmed` are the only states the customer can cancel
// from per backend `_CUSTOMER_CANCELLABLE` (app/domain/orders/order_service.py).

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded"

export type DeliveryMethod = "delivery" | "pickup"

const TERMINAL: ReadonlySet<OrderStatus> = new Set(["delivered", "cancelled", "refunded"])
const CUSTOMER_CANCELLABLE: ReadonlySet<OrderStatus> = new Set(["pending", "confirmed"])

export function isTerminal(status: string | undefined | null): boolean {
  if (!status) return false
  return TERMINAL.has(status as OrderStatus)
}

export function isCustomerCancellable(status: string | undefined | null): boolean {
  if (!status) return false
  return CUSTOMER_CANCELLABLE.has(status as OrderStatus)
}

/**
 * The expected (happy-path) sequence of statuses for a given delivery
 * method. `cancelled` and `refunded` are NOT part of the sequence —
 * they are terminal interrupts the StatusTimeline collapses into a
 * single muted row. The sequence is what we render as the timeline
 * spine: each step is "done", "active", or "upcoming" depending on
 * the order's current status + history.
 */
export function expectedSequence(deliveryMethod: string | undefined | null): OrderStatus[] {
  if (deliveryMethod === "pickup") {
    return ["pending", "confirmed", "preparing", "ready_for_pickup", "delivered"]
  }
  // Default to delivery sequence for "delivery" or unknown.
  return ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"]
}

export const TERMINAL_STATUSES: readonly OrderStatus[] = ["delivered", "cancelled", "refunded"]
