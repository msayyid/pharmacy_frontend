import * as Sentry from "@sentry/nextjs"

import { scrubPii } from "@/lib/observability/scrub"

// Observability breadcrumb. Phase 11D.
//
// Phase 1 stub-shipped this file; Phase 11D wires the real Sentry body.
// Consumers added across phases 8/9/10 (cart mutations, idempotency-key
// lifecycle, order cancel/reorder) keep working unchanged: same import,
// same call shape.
//
// Without SENTRY_DSN configured (dev/CI/staging-test), the SDK init in
// sentry.{server,edge}.config.ts + instrumentation-client.ts is a no-op,
// and Sentry.addBreadcrumb is a no-op too. We additionally echo to the
// dev console so dev sessions still see the lifecycle output.
//
// PII discipline: scrubPii runs on `data` here in addition to the
// beforeSend filter at the Sentry boundary. Belt-and-suspenders: even
// if a consumer accidentally passes `phone` / `email` / `address` in
// the data payload, the breadcrumb persisted to Sentry has them
// redacted. Sacred-invariant #8.

export interface TraceContext {
  category: string
  message: string
  data?: Record<string, unknown>
  level?: "debug" | "info" | "warning" | "error"
}

export function trace({ category, message, data, level = "info" }: TraceContext): void {
  const scrubbedData = data ? scrubPii(data) : undefined
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    ...(scrubbedData ? { data: scrubbedData } : {}),
  })

  if (process.env.NODE_ENV !== "production") {
    const consoleMethod = level === "error" ? "error" : level === "warning" ? "warn" : "debug"
    console[consoleMethod](`[${category}] ${message}`, scrubbedData ?? {})
  }
}
