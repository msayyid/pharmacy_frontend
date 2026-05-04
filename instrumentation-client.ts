import * as Sentry from "@sentry/nextjs"

import { scrubPii } from "@/lib/observability/scrub"

// Sentry client init. Phase 11D.
//
// Next 15 picks this file up automatically (sibling of instrumentation.ts).
// DSN-less init is a runtime no-op so dev/CI/staging-test do not need a
// real DSN. Real DSN injection is Phase 12 (Coolify env).
//
// `replaysSessionSampleRate` deliberately omitted at MVP — we don't want
// to ship session replay to the client until we've reviewed the privacy
// implications with legal (recording forms means recording phone + address
// inputs even if Sentry's default mask works).

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENV ?? "development",
    release:
      process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
