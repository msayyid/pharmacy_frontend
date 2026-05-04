# Runbook — Monitoring

> Sentry navigation, web vitals, log streams. Phase 12 deliverable.

## Where signals live

| Signal                            | Source                                       | Where to look                                     |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| Frontend errors                   | Sentry SDK (browser + server)                | Sentry → Issues                                   |
| Web Vitals (LCP/FCP/CLS/INP/TTFB) | `<WebVitalsReporter />` → Sentry breadcrumbs | Sentry → Performance → Web Vitals                 |
| Backend errors                    | Sentry (separate project)                    | Sentry → `nookat-backend` project                 |
| API latency                       | Sentry performance + backend's Grafana       | Same Sentry; `api.nookat.kg/metrics` (admin-only) |
| HTTP-level health                 | Coolify health-check                         | Coolify dashboard, last 24h                       |
| TLS / cert health                 | Coolify (Caddy/Traefik)                      | Coolify deployment logs                           |

## Sentry first-look checklist (incident triage)

1. **Open the Issues tab**, sorted by "Last Seen." Recent unresolved issues at the top.
2. **Filter by environment.** Production-only first; staging issues are noise during incident triage.
3. **Open the issue.** Read:
   - **Title** — Sentry's auto-generated summary.
   - **Tags** — `release`, `environment`, `url`, `user.id` (if authed; we never log phone/email/address — sacred-invariant #8).
   - **Breadcrumbs** — last ~50 events before the error. Look for our `category: "log"`, `category: "render.error"`, `category: "web-vitals"` crumbs. PII fields are redacted by `lib/observability/scrub.ts` (defense in depth).
   - **Stack trace** — source maps uploaded by `SENTRY_AUTH_TOKEN` during Coolify build.
4. **Compare against `release`.** Did the issue start at a deploy? Find the commit; correlate with `git log` and Coolify deployment timestamps.
5. **`X-Request-ID` correlation.** FE `parseApiError` captures the backend's echoed `X-Request-ID`. Search the backend's Sentry / log stream for the same UUID to stitch the trace across FE → backend.

## Web Vitals dashboard

Sentry → Performance → Web Vitals. We report all five (LCP, FCP, CLS, INP, TTFB) per page. Targets per FRONTEND_BLUEPRINT §17.1:

| Metric | Customer storefront target |
| ------ | -------------------------- |
| LCP    | ≤ 2.5s (Slow 3G)           |
| FCP    | ≤ 1.8s                     |
| TTI    | ≤ 3.5s                     |
| CLS    | ≤ 0.1                      |
| INP    | ≤ 200ms                    |

Sort by URL to find slow pages. PDP and search are the most expensive routes; if either drifts above target, investigate before next deploy.

## PII discipline at Sentry

Two layers scrub PII (sacred-invariant #8):

1. `lib/observability/trace.ts` calls `scrubPii(data)` before passing to `Sentry.addBreadcrumb`.
2. `beforeSend` in `sentry.server.config.ts` + `instrumentation-client.ts` runs `scrubPii` on every `event.breadcrumbs[].data` and `event.request.data` reaching the SDK boundary.

Field-name regex in `lib/observability/scrub.ts` covers `phone`, `email`, `address`, `recipient`, `recipient_phone`, `recipient_name`, `customer_notes`, `delivery_address`, `firstname`, `lastname`, `password`, `token`, `access_token`, `refresh_token`. Add fields here as the schema grows.

**If PII appears in a Sentry event:** treat as a P0 incident. Steps:

1. Sentry → settings → discard the affected event.
2. Identify the consumer that bypassed the scrub.
3. Add the field name to `lib/observability/scrub.ts`'s regex.
4. Add a unit test that fails if the field surfaces unscrubbed.
5. Patch + redeploy.

## Alert routing

Sentry alerts go to:

- Critical errors (`level: error`, `unhandled: true`): page on-call (PagerDuty / Telegram bot — TBD pre-launch).
- New issues at production environment: notification channel (TBD).
- Web Vitals regression: weekly digest only.

Alert routing config lives in Sentry's Alerts UI; document the actual rules in this file once they're set up.

## Backend correlation

Frontend errors that look like API failures should be cross-referenced with backend Sentry:

1. Find the failing FE error → grab `X-Request-ID` from the breadcrumb.
2. Switch to backend Sentry project.
3. Search `request.id:<uuid>` to find the matching backend event.
4. If backend has no matching error, the FE saw a network failure (timeout, TLS, DNS) — not a backend bug. Check Coolify health-check graphs and Caddy logs.

## Coolify health graphs

Coolify dashboard → project → Deployments. Each deployment shows:

- Healthcheck status (green/red over time)
- Container logs (stdout/stderr from `node server.js`)
- Resource usage (CPU/RAM/network)

Healthcheck failure history is kept for 30 days.

## Daily health rhythm (post-launch)

- **Morning:** check Sentry's last-24h Issues count. Triage critical/serious; assign or close.
- **Wednesday:** Web Vitals trend review. Compare against last week's medians.
- **Weekly:** dependency audit (`pnpm audit`). Renovate/Dependabot PR review.
- **Monthly:** review Sentry alert rules. Tighten or relax based on incident data.

## What to keep OFF Sentry

- Customer phone, email, address (filtered by `scrubPii`).
- OTP codes (never logged client-side; see `lib/auth/refresh.ts` + `lib/cart/merge.ts`).
- Cart contents in raw form — totals are fine, recipient_phone/recipient_name are scrubbed.
- Authorization headers (filtered by Sentry's default scrubber).

If you need richer telemetry, the right path is a structured-event analytics tool (Plausible / Yandex.Metrica), not lower-fidelity Sentry events. PRODUCT §10 and the Phase 1.5+ backlog gate analytics on legal review.
