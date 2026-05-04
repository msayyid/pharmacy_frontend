import * as Sentry from "@sentry/nextjs"

// Next 15 instrumentation hook. Phase 11D.
//
// Routes per-runtime to the matching Sentry config so the same SDK init
// gets bundled with each runtime's bundle. Client init is in
// instrumentation-client.ts (Next loads it automatically alongside this
// file).
//
// Without SENTRY_DSN set, both server and edge inits are runtime no-ops
// (see sentry.server.config.ts / sentry.edge.config.ts). Real DSN is wired
// at deploy time via Coolify env (Phase 12).

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

// Next 15 hook: errors thrown in nested RSC boundaries reach this handler.
// Sentry forwards them to the SDK regardless of where in the request the
// error originated.
export const onRequestError = Sentry.captureRequestError
