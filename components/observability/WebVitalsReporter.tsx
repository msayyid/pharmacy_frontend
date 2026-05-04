"use client"

import * as Sentry from "@sentry/nextjs"
import { useReportWebVitals } from "next/web-vitals"

// Web Vitals → Sentry. Phase 11D — FRONTEND_BLUEPRINT §19.2.
//
// `useReportWebVitals` is Next's hook that calls back with each Core Web
// Vital as the page renders (LCP, FCP, CLS, INP, TTFB). We ship them as
// Sentry breadcrumbs (low signal-per-event but cheap; tracesSampleRate
// 0.1 already filters elsewhere).
//
// Without SENTRY_DSN, Sentry.captureMessage / addBreadcrumb are no-ops
// (DSN gating in sentry.client.config.ts), so this hook costs nothing
// in dev/CI. Real values flow once Phase 12 wires the DSN.
//
// Implementation note: useReportWebVitals must live in a Client Component;
// hence the dedicated `<WebVitalsReporter />` island. It's mounted in
// `app/[locale]/layout.tsx` so the report fires regardless of route.

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    Sentry.addBreadcrumb({
      category: "web-vitals",
      message: metric.name,
      level: "info",
      data: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      },
    })
  })

  return null
}
