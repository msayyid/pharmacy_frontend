import { trace } from "@/lib/observability/trace"

// Structured client logger. Phase 11D — FRONTEND_BLUEPRINT §19.3.
//
// Thin wrapper that funnels to `trace()` (which writes to Sentry breadcrumbs
// + dev console). Three log levels matching the spec:
//
//   log.info("cart.added", { productId, quantity })
//   log.warn("checkout.price_changed", { items })
//   log.error("api.failed", { code, status, requestId })
//
// PII discipline (sacred-invariant #8): scrubPii runs at the trace()
// boundary. Callers passing typed objects don't need to think about
// it — common PII field names (`phone`, `email`, `address`, etc.) are
// redacted regardless.
//
// Why both `trace` and `log`? Naming clarity. `trace()` is the low-level
// breadcrumb primitive (used inside lib/checkout/lib/orders for
// idempotency lifecycle, cancel/reorder events — terminology aligned
// with the underlying Sentry API). `log()` is the application-level
// equivalent for ad-hoc consumers — same destination, different shape.

export const log = {
  info(message: string, data?: Record<string, unknown>): void {
    trace({ category: "log", message, level: "info", ...(data ? { data } : {}) })
  },
  warn(message: string, data?: Record<string, unknown>): void {
    trace({ category: "log", message, level: "warning", ...(data ? { data } : {}) })
  },
  error(message: string, data?: Record<string, unknown>): void {
    trace({ category: "log", message, level: "error", ...(data ? { data } : {}) })
  },
} as const
