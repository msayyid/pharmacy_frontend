import * as Sentry from "@sentry/nextjs"

import { scrubPii } from "@/lib/observability/scrub"

// Sentry server runtime init. Phase 11D.
//
// DSN is optional: without SENTRY_DSN, Sentry.init becomes a no-op and the
// SDK silently absorbs all calls. This matches the dev/CI/build:ci contract
// (Phase 3 D11 — env Zod-parses; SENTRY_DSN is z.string().optional()).
//
// Real DSN is configured at deploy time via Coolify env (Phase 12 / pre-
// launch). The release identifier follows the backend's pattern:
// `nookat-storefront@<package_version>+<git_sha>`. Coolify injects
// SENTRY_RELEASE; locally it falls back to the package version alone.
//
// `tracesSampleRate: 0.1` per FRONTEND_BLUEPRINT §19.1.
// `beforeSend` runs scrubPii on the event's `breadcrumbs[].data` and
// `request.data` to satisfy sacred-invariant #8 (no PII logged client-side
// — Sentry breadcrumbs cross from client to Sentry, so the scrub runs
// here on the server SDK's beforeSend boundary too).

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENV ?? "development",
    release:
      process.env.SENTRY_RELEASE ??
      `nookat-storefront@${process.env.npm_package_version ?? "0.0.0"}`,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) =>
          crumb.data ? { ...crumb, data: scrubPii(crumb.data) } : crumb,
        )
      }
      if (event.request?.data) {
        event.request.data = scrubPii(event.request.data) as typeof event.request.data
      }
      return event
    },
  })
}
