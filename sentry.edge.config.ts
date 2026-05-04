import * as Sentry from "@sentry/nextjs"

// Sentry edge runtime init. Phase 11D. Slim — no beforeSend on the edge
// where breadcrumb shapes don't reach our trace() callers.

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENV ?? "development",
    release:
      process.env.SENTRY_RELEASE ??
      `nookat-storefront@${process.env.npm_package_version ?? "0.0.0"}`,
    tracesSampleRate: 0.1,
  })
}
