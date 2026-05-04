# Architecture — Nookat Storefront

> What this is, how it's wired, where it deploys. Phase 12 deliverable.
> Read with `FRONTEND_BLUEPRINT.md` for the spec-level "why."

## Topology

```
            Customer (browser, mobile-first)
                       │
                       │ HTTPS
                       ▼
              ┌────────────────────┐
              │  Caddy / Traefik   │  TLS, HSTS, CSP, gzip
              │  (Coolify-managed) │
              └────────┬───────────┘
                       │
              ┌────────▼───────────┐
              │  nookat-storefront │  Next.js 15 (App Router, RSC default)
              │  (Node 20-alpine)  │  Standalone server.js, port 3000
              └────────┬───────────┘
                       │ HTTPS (api.nookat.kg)
                       ▼
              ┌────────────────────┐
              │ pharmacy_backend   │  FastAPI v1.0.0-rc1
              │ (read-only — never │  MySQL 8 + Redis + ARQ
              │  modified by FE)   │
              └────────────────────┘

  Sentry (errors + web vitals)  ◄─── frontend & backend both report
  Coolify (deploy, env, TLS)    ─── single VPS, KG-edge latency
```

Same VPS as the backend (decision in `DECISION_LOG.md` 2026-05-03). Not Vercel — KG-edge latency on Vercel hurts the audience.

## Stack

| Layer          | Choice                             | Why                                                                 |
| -------------- | ---------------------------------- | ------------------------------------------------------------------- |
| Framework      | Next.js 15 App Router              | RSC default, route-level code splitting, mature ecosystem           |
| Language       | TypeScript strict                  | `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`    |
| Styling        | Tailwind 4 + brand tokens          | CSS custom properties; no raw hex/spacing in components             |
| Components     | shadcn/ui on Radix UI              | Copy-paste owned in `components/ui/`; we customize                  |
| State (server) | TanStack Query v5                  | One QueryClient; cart/orders polling via `refetchInterval`          |
| State (client) | Zustand (narrow)                   | One store per concern; cart drawer UI, auth in-memory               |
| i18n           | next-intl 4.11                     | URL-prefix `[locale]`, three locales `ru \| ky \| en`, RU canonical |
| Forms          | react-hook-form + Zod              | Zod parses at boundaries, RHF for inputs                            |
| API client     | openapi-typescript + openapi-fetch | Generated types from `${API_URL}/openapi.json`                      |
| Errors         | `ApiError` + i18n keys             | `error.${code}` resolves via backend's ProblemDetails               |
| Observability  | Sentry + Web Vitals                | DSN-optional; no-op without env. PII scrub at two layers.           |
| Tests          | Vitest + RTL + Playwright          | Unit/component/E2E; axe-core for a11y                               |

## Repo layout

```
.
├── app/[locale]/...                  Locale-prefixed routes (storefront)
│   ├── layout.tsx                    metadataBase + Providers + Header/Footer
│   ├── error.tsx / not-found.tsx     Locale-aware boundaries
│   ├── {cart,checkout,account,orders,auth}/layout.tsx
│   │                                 Thin Server-Component wrappers exporting
│   │                                 robots:noindex,nofollow on hard-gated
│   │                                 transactional segments (Phase 11B D3).
│   ├── legal/{terms,privacy,delivery,returns}/page.tsx
│   │                                 Phase 12A placeholder shells (noindex
│   │                                 until real legal text lands).
│   └── ...
├── app/global-error.tsx              Bare-HTML root error boundary
├── app/sitemap.ts / robots.ts        Phase 11A SEO foundation
├── app/api/{auth,health,diag}/...    Route handlers — no Server Component
│                                     parents, layout-free by Next convention
├── components/
│   ├── ui/                           shadcn primitives, owned + customized
│   ├── catalog/ product/ search/ ...  Domain components
│   ├── feedback/ EmptyState ErrorState
│   ├── observability/ WebVitalsReporter
│   └── legal/ LegalPlaceholderShell  Phase 12A
├── lib/
│   ├── api/                          openapi-fetch client + types + errors
│   ├── auth/ cart/ orders/ checkout/ Bounded contexts
│   ├── observability/ trace.ts scrub.ts log.ts
│   ├── seo/                          jsonld.tsx, site-url.ts, title.ts
│   ├── format/                       price/date/number/phone formatters
│   └── env/                          server.ts client.ts (Zod-validated)
├── messages/{ru,ky,en}.json          Flat-dotted keys mirroring backend
├── i18n/                             Request config + flat-to-nested unflatten
├── generated/api.d.ts                openapi-typescript output (checked in)
├── instrumentation.ts                Next 15 hook → routes to per-runtime
├── instrumentation-client.ts         Sentry client init
├── sentry.{server,edge}.config.ts    Sentry per-runtime configs
├── public/brand/                     Logo placeholders (real logo pre-launch)
├── tests/{unit,component,e2e,smoke}/
└── specs/                            PRODUCT/DESIGN/FRONTEND blueprints
                                      + phased-build prompts
```

**Layering rule:** `app/` → `components/` → `lib/` → `generated/`. Pages compose components. Components consume hooks. Only `lib/api` calls the backend.

## Authentication

Customer storefront uses **JWT bearer + HttpOnly refresh cookie** at our origin.

- Backend issues `{access_token, refresh_token, expires_in}` from `POST /api/v1/auth/otp/verify`.
- FE wraps the refresh into an HttpOnly cookie at `/api/auth/set-tokens` (Next route handler at our origin). JS never touches the refresh token.
- Access token lives in memory only (Zustand `useAuthStore`).
- Single-flight refresh in `lib/auth/refresh.ts` dedupes concurrent 401s app-wide.
- Hard gate via `middleware.ts` on `/[locale]/{account,orders,me,cart,checkout,auth}/...`.

Admin app (separate repo) uses session cookies; not relevant here.

## Sentry & PII

- `@sentry/nextjs` v10 wired in Phase 11D.
- DSN-optional: `SENTRY_DSN` env. Without it, `Sentry.init` is a runtime no-op (dev/CI/staging-test contract).
- `tracesSampleRate: 0.1`. `release` follows backend pattern (`nookat-storefront@<version>`).
- **PII scrub at two layers** (sacred-invariant #8):
  1. `lib/observability/trace.ts` runs `scrubPii` on `data` before passing to `Sentry.addBreadcrumb`
  2. `beforeSend` filters `event.breadcrumbs[].data` and `event.request.data` at the SDK boundary
- Web Vitals → Sentry breadcrumbs via `<WebVitalsReporter />` (Phase 11D).

## Security headers

`next.config.ts` `async headers()` — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`. **CSP set at the reverse proxy** (Caddy/Traefik) per FRONTEND_BLUEPRINT §18.1 — varies per-environment.

## Build & deploy

- `Dockerfile`: multistage `deps → builder → runtime`. Standalone Next output. Healthcheck on `/api/health`.
- Build env stubs (`API_URL`, `NEXT_PUBLIC_*`) injected at builder stage so `lib/env/server.ts`'s Zod parse doesn't crash during page-data collection. Real prod values come from Coolify.
- Runtime env: `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ENV`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_RELEASE`. See `docs/runbooks/deploy.md` and `.env.example`.
- Coolify auto-deploys on push to `main` (production) and `staging` branch (staging).

## Verification gate

Every phase boundary runs:

```
pnpm lint && pnpm typecheck && pnpm test && pnpm i18n:check
pnpm build && pnpm build:ci          # build:ci strips dev .env.local
pnpm e2e --grep-invert @requires-backend
pnpm launch:check                    # Phase 12D grep gates
docker build -t nookat-storefront:dev .
```

CI mirrors the gate in `.github/workflows/ci.yml`.

## References

- `CLAUDE.md` — operating principles, sacred invariants, hard prohibitions
- `BUILD_PROGRESS.md` — current phase, smoke recipes, backlog
- `DECISION_LOG.md` — non-obvious choices and rationale
- `OPEN_QUESTIONS.md` — backend asks, deferred items
- `RISKS.md` — active risks
- `LAUNCH_CHECKLIST.md` — pre-public-launch gate
- Specs: `specs/{DESIGN,FRONTEND,FRONTEND_CLAUDE_CODE_PROMPTS}_BLUEPRINT.md`
