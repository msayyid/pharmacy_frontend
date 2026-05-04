// Observability breadcrumb stub. Phase 1 installed @sentry/nextjs but
// the SDK runtime is wired in Phase 11. Until then, every trace() call
// logs to the dev console only — production builds drop the call.
//
// Phase 9 + 8 use this for idempotency-key lifecycle (mint, reuse,
// conflict, retry). The breadcrumb investment now is intended to make
// post-incident debugging tractable: idempotency bugs are the hardest
// class to debug from logs alone.
//
// Phase 11 swap-in: replace the body with
//   `Sentry.addBreadcrumb({ category, message, data, level: "info" })`
// when the SDK is initialized. Consumers don't change.

export interface TraceContext {
  category: string
  message: string
  data?: Record<string, unknown>
  level?: "debug" | "info" | "warning" | "error"
}

export function trace({ category, message, data, level = "info" }: TraceContext): void {
  if (process.env.NODE_ENV !== "production") {
    const consoleMethod = level === "error" ? "error" : level === "warning" ? "warn" : "debug"
    console[consoleMethod](`[${category}] ${message}`, data ?? {})
  }
  // Phase 11: Sentry.addBreadcrumb({ category, message, data, level })
}
