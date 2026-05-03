# Frontend Blueprint — Nookat

> **Purpose.** The architecture and implementation specification for Nookat's two web frontends — customer storefront and admin panel. Defines stack, repo structure, routing, state, data fetching, auth, i18n, error handling, and performance.
>
> **Companion docs.** Read alongside `DESIGN_BLUEPRINT.md` (visual & interaction) and `FRONTEND_CLAUDE_CODE_PROMPTS.md` (phased build prompts). When the two disagree: **design wins on visual & interaction behaviour, frontend (this doc) wins on implementation, backend wins on data shape and API contracts**.
>
> **Backend reference.** All API contracts come from the backend repo at `https://github.com/msayyid/pharmacy_backend`. The OpenAPI spec at `${API_URL}/openapi.json` is the live source of truth for endpoint shapes; type generation pulls from it. **Do not redefine response shapes manually.**
>
> **Author voice.** Senior frontend engineer who has shipped consumer e-commerce and B2B admin apps; opinionated where opinions matter, agnostic where they don't.

---

## Table of Contents

1. [Architecture overview](#1-architecture-overview)
2. [Tech stack](#2-tech-stack)
3. [Two apps, two repos](#3-two-apps-two-repos)
4. [Directory structure (storefront)](#4-directory-structure-storefront)
5. [Directory structure (admin)](#5-directory-structure-admin)
6. [Backend API integration](#6-backend-api-integration)
7. [Type generation from OpenAPI](#7-type-generation-from-openapi)
8. [Authentication & sessions](#8-authentication--sessions)
9. [Routing strategy](#9-routing-strategy)
10. [Data fetching](#10-data-fetching)
11. [State management](#11-state-management)
12. [Forms and validation](#12-forms-and-validation)
13. [Internationalization](#13-internationalization)
14. [Error handling](#14-error-handling)
15. [Caching strategy](#15-caching-strategy)
16. [Image handling](#16-image-handling)
17. [Performance budgets](#17-performance-budgets)
18. [Security](#18-security)
19. [Observability](#19-observability)
20. [Testing strategy](#20-testing-strategy)
21. [Code conventions](#21-code-conventions)
22. [Build, deploy, environments](#22-build-deploy-environments)
23. [Phased build sequence](#23-phased-build-sequence)
24. [Conventions checklist](#24-conventions-checklist)

---

## 1. Architecture overview

### 1.1 At a glance

Two Next.js applications consuming the same FastAPI backend:

```
                           ┌──────────────────────┐
                           │  pharmacy-storefront │  ← customers (RU/KY/EN)
                           │  Next.js 15 + RSC    │
                           │  storefront.nookat.kg│
                           └──────────┬───────────┘
                                      │
                                      ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│   pharmacy-admin     │──▶│   pharmacy_backend   │──▶│   MySQL 8 + Redis    │
│   Next.js 15 + RSC   │   │   FastAPI / asyncmy  │   │                      │
│   admin.nookat.kg    │   │   api.nookat.kg      │   │                      │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
                                      │
                                      ▼
                              SMS / Pay / R2 (live or fakes)
```

### 1.2 Why two apps

The backend exposes two distinct API tiers (`/api/v1/*` and `/api/admin/v1/*`) with completely different auth models (JWT bearer vs. server-side cookie session) and completely different audience needs (customers want speed and clarity; admins want density and keyboard control). One codebase forces architectural compromises that hurt both.

The reason for two **separate repos** (not one monorepo with two apps) is operational: smaller bundles, separate deployments, separate auth flows, simpler CI, and the ability to ship admin features without touching production storefront. We share code through a small published package or git submodule when overlap matters (i18n strings, design tokens, type definitions).

### 1.3 Code sharing strategy

Two patterns considered:

- **A. Monorepo (Turborepo / pnpm workspaces)** — shared packages (`@nookat/ui`, `@nookat/api-client`, `@nookat/i18n`) live in `packages/`; both apps consume them. One repo, one PR for cross-cutting changes. **Heavier upfront tooling.**
- **B. Two repos, share via npm (private)** — `nookat-storefront` and `nookat-admin` both depend on `@nookat/shared` published to a private registry. Cleaner separation, more publish-cycle overhead.

**Decision:** Start with **B** for MVP — two clean repos, no shared package yet. Duplicate the few things that overlap (design tokens, generated API types). When duplication starts to hurt (Phase 1.5+), promote to a published `@nookat/shared` package, not a monorepo.

This document covers the storefront primarily; admin patterns differ where called out (and have their own dedicated phase in the prompts).

---

## 2. Tech stack

> **Pinned versions** — confirm latest at Phase 0 via web search. These are the floors.

### 2.1 Core

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 20 LTS | Stable, broad ecosystem support, long support window |
| Framework | Next.js 15+ App Router | RSC by default, file-based routing, edge/node runtime per route |
| Language | TypeScript 5.5+ strict | Catch errors at compile time; non-negotiable |
| Styling | Tailwind CSS 4 | Utility-first, design-token-driven; `tailwind.config.ts` defines our brand tokens |
| Component primitives | shadcn/ui (Radix underneath) | Copy-paste owned components; we own the code |
| Icons | Lucide React | Free, geometric, full set |

### 2.2 State & data

| Concern | Choice | Why |
|---|---|---|
| Server state | TanStack Query v5 | Cache, dedupe, retry, suspense integration; mature |
| Client state | Zustand | For genuinely client-only state (cart UI, filter sheet open/closed); simple API |
| Forms | react-hook-form + Zod | Performant, type-safe, validation-rich |
| Schemas (forms + API parsing) | Zod | Single source of truth at the boundary |
| API client | Generated from OpenAPI via `openapi-fetch` + `openapi-typescript` | Types and client both derived from `${API_URL}/openapi.json` |

### 2.3 i18n & utilities

| Concern | Choice | Why |
|---|---|---|
| i18n | next-intl 3+ | App Router native, server + client components, ICU MessageFormat |
| Phone | libphonenumber-js | Same algorithm as backend's `phonenumbers` |
| Dates | date-fns 4+ | Tree-shakeable, locale-aware (ru, ky-KG, en-US) |
| HTTP | Built-in `fetch` (Next.js extended) | RSC-friendly; openapi-fetch wraps it |
| Logging (client) | Custom thin wrapper around console + Sentry | No heavy logger libs |

### 2.4 Quality

| Concern | Choice |
|---|---|
| Linter | ESLint 9 (flat config) with `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-jsx-a11y`, `eslint-plugin-tailwindcss` |
| Formatter | Prettier 3 with `prettier-plugin-tailwindcss` (auto-sorts classes) |
| Testing | Vitest (unit), Playwright (E2E), React Testing Library (component) |
| Pre-commit | Husky + lint-staged |
| CI | GitHub Actions: lint, type-check, test, build, deploy |

### 2.5 Observability

| Concern | Choice |
|---|---|
| Errors | Sentry (`@sentry/nextjs`) |
| Web vitals | Next.js `useReportWebVitals` → Sentry |
| Analytics | None for MVP (PRODUCT §10 says no customer-side integrations now). Hooks ready for Phase 1.5 (likely Plausible or Yandex.Metrica). |

### 2.6 Deployment

| Target | Choice |
|---|---|
| Storefront | Coolify on the same VPS as backend (close to API; predictable cost; good fit for KG audience). Alternative: Vercel — simpler but adds latency from EU edge to KG. **Decision: Coolify**. |
| Admin | Same Coolify VPS — separate sub-deployment |
| Build artifact | Docker image (multistage; same Dockerfile pattern as backend) |
| TLS | Caddy or Traefik in front of containers; Let's Encrypt |

---

## 3. Two apps, two repos

### 3.1 Storefront repo: `nookat-storefront`

**Audience:** customers (Aizhana, Bekzat, Gulnara from PRODUCT §4).
**Domain:** `storefront.nookat.kg` (or `nookat.kg` for the apex).
**Languages:** RU primary, KY, EN.
**Auth:** SMS-OTP (PRODUCT §F-AUTH-001) + dev password fallback (the backend supports both; storefront primarily uses OTP).
**Routing strategy:** locale-prefixed (`/ru/...`, `/ky/...`, `/en/...`) with RU as default if no prefix.
**Performance budget:** strict — see §17.

### 3.2 Admin repo: `nookat-admin`

**Audience:** admin staff (Aibek owner, Nurzat branch manager, Aida pharmacist, Marat content editor — PRODUCT §4.4).
**Domain:** `admin.nookat.kg`.
**Languages:** RU primary; admin works in one language for simplicity (PRODUCT §19 doesn't require admin localization for MVP).
**Auth:** email + password + optional TOTP → server-side cookie session (per backend admin auth).
**Routing strategy:** no locale prefix (single-language admin).
**Performance budget:** looser — admins are on desktop with stable connections.

### 3.3 Shared concerns

- **Design tokens.** Both apps use the same `globals.css` with the brand tokens from DESIGN §4–10. Duplicated initially; promoted to a shared package in Phase 1.5.
- **API types.** Both apps run `openapi-typescript` against the backend OpenAPI; both pin to the same backend version.
- **i18n strings (storefront only).** The storefront mirrors backend's `app/i18n/*.json` keys. Same JSON shape for parity.

---

## 4. Directory structure (storefront)

```
nookat-storefront/
├── app/                              # Next.js App Router routes
│   ├── [locale]/                     # locale segment (ru | ky | en)
│   │   ├── layout.tsx                # locale-bound RootLayout
│   │   ├── page.tsx                  # homepage
│   │   ├── (storefront)/             # group: regular customer pages
│   │   │   ├── search/page.tsx
│   │   │   ├── categories/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── products/page.tsx
│   │   │   ├── symptoms/[slug]/page.tsx
│   │   │   ├── products/[slug]/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   └── checkout/page.tsx
│   │   ├── (account)/                # group: auth-gated pages
│   │   │   ├── account/page.tsx
│   │   │   ├── account/addresses/page.tsx
│   │   │   ├── orders/page.tsx
│   │   │   ├── orders/[orderNumber]/page.tsx
│   │   │   └── auth/
│   │   │       └── otp/page.tsx
│   │   ├── (legal)/
│   │   │   ├── terms/page.tsx
│   │   │   ├── privacy/page.tsx
│   │   │   ├── delivery/page.tsx
│   │   │   └── returns/page.tsx
│   │   ├── error.tsx                 # locale-level error boundary
│   │   ├── not-found.tsx
│   │   └── loading.tsx
│   ├── api/                          # Next.js route handlers (BFF if needed)
│   │   └── revalidate/route.ts       # webhook for cache busts (Phase 7+)
│   ├── layout.tsx                    # root, locale-agnostic shell
│   ├── globals.css                   # brand tokens + Tailwind layers
│   ├── manifest.ts                   # PWA manifest
│   └── robots.ts
├── components/
│   ├── ui/                           # shadcn primitives (Button, Dialog, etc.)
│   ├── product/                      # ProductCard, StockPip, PriceTag, ...
│   ├── cart/                         # CartLine, CartTotals, CartDrawer
│   ├── checkout/                     # CheckoutForm, AddressPicker, PaymentRadio
│   ├── order/                        # OrderStatusTimeline, OrderItemRow
│   ├── address/                      # AddressCard, AddressForm
│   ├── auth/                         # OtpInput, LoginGate
│   ├── search/                       # SearchInput, SearchSuggest
│   ├── symptom/                      # SymptomTile, SymptomGrid
│   ├── feedback/                     # EmptyState, ErrorState, Toast
│   ├── i18n/                         # LangSwitcher
│   ├── support/                      # PhoneCallButton
│   ├── marketing/                    # TrustStrip, HeroBlock
│   └── layout/                       # Header, Footer, MobileNav
├── lib/
│   ├── brand.ts                      # BRAND constant — single source for name/tagline
│   ├── api/
│   │   ├── client.ts                 # openapi-fetch instance, RSC + client variants
│   │   ├── server.ts                 # server-side fetcher (RSC + route handlers)
│   │   ├── types.ts                  # re-export from generated/api.d.ts
│   │   └── errors.ts                 # ProblemDetails parser → ApiError
│   ├── auth/
│   │   ├── tokens.ts                 # access/refresh token storage
│   │   ├── refresh.ts                # silent refresh logic
│   │   └── guards.ts                 # client + server auth guards
│   ├── cart/
│   │   ├── store.ts                  # Zustand store for cart UI hints
│   │   └── helpers.ts                # totals math, threshold helpers
│   ├── i18n/
│   │   ├── config.ts                 # next-intl config
│   │   └── request.ts                # locale resolver
│   ├── phone/
│   │   └── format.ts                 # libphonenumber wrappers
│   ├── format/
│   │   ├── price.ts                  # KGS formatter, locale-aware
│   │   ├── date.ts                   # date-fns wrappers
│   │   └── number.ts
│   ├── seo/
│   │   ├── meta.ts                   # generate metadata helpers
│   │   └── jsonld.ts                 # Product, BreadcrumbList, Organization
│   └── analytics/
│       └── events.ts                 # event names matching PRODUCT §22.7 (no-op for MVP)
├── messages/                         # next-intl message JSON
│   ├── ru.json
│   ├── ky.json
│   └── en.json
├── generated/                        # checked-in generated artifacts
│   ├── api.d.ts                      # from openapi-typescript
│   └── README.md                     # how to regenerate
├── public/
│   ├── brand/
│   │   ├── logo-horizontal.svg
│   │   ├── logo-mark.svg
│   │   └── logo-mono.svg
│   ├── icons/                        # favicons, PWA icons
│   └── images/                       # hero washes, decorative SVGs
├── tests/
│   ├── e2e/                          # Playwright
│   ├── unit/                         # Vitest unit tests
│   └── component/                    # RTL component tests
├── .env.example
├── .env.local                        # gitignored
├── eslint.config.js
├── next.config.ts
├── postcss.config.mjs
├── prettier.config.cjs
├── tailwind.config.ts
├── tsconfig.json
├── playwright.config.ts
├── vitest.config.ts
├── package.json
├── pnpm-lock.yaml
├── Dockerfile
├── README.md
├── CLAUDE.md
├── BUILD_PROGRESS.md
├── DECISION_LOG.md
├── CHANGELOG.md
├── OPEN_QUESTIONS.md
└── RISKS.md
```

### 4.1 Layering rule

```
app/  →  components/  →  lib/  →  generated/
```

Pages (`app/`) compose components and call `lib/api`. Components read from props or hooks; never call APIs directly except via `lib/api`. `lib/` has no dependency on `components/` or `app/`. `generated/` is consumed by `lib/api/` and never mutated by hand.

---

## 5. Directory structure (admin)

```
nookat-admin/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx               # bare auth layout
│   ├── (admin)/                     # auth-gated, sidebar-shell layout
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # dashboard / order queue
│   │   ├── orders/
│   │   │   ├── page.tsx             # queue
│   │   │   └── [id]/page.tsx        # detail / picking
│   │   ├── catalog/
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── manufacturers/
│   │   │   ├── ingredients/
│   │   │   └── symptoms/
│   │   ├── inventory/
│   │   │   ├── batches/
│   │   │   └── receive/             # receive stock flow
│   │   ├── reports/
│   │   │   ├── sales/
│   │   │   └── top-products/
│   │   └── audit/
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   ├── data-table/                   # TanStack Table-based DataTable
│   ├── batch/                        # BatchPicker, ExpiryDateInput
│   ├── order/                        # OrderActionStrip, PickingList
│   ├── audit/                        # DiffViewer
│   └── layout/                       # AdminHeader, Sidebar
├── lib/
│   ├── api/                          # admin API client (different base path)
│   ├── auth/                         # session cookie handling
│   └── ...
├── messages/ru.json                  # admin is single-language
└── ...
```

The admin shape is similar but tuned for tables and dense data. It does not have a locale segment.

---

## 6. Backend API integration

### 6.1 The contract

The backend at `https://github.com/msayyid/pharmacy_backend` exposes:

- **Customer API:** `${API_URL}/api/v1/*`
- **Admin API:** `${API_URL}/api/admin/v1/*`
- **Webhooks:** `${API_URL}/api/webhooks/*` (we don't consume these from the frontend)
- **OpenAPI spec:** `${API_URL}/openapi.json` (with `?docs=true` enabling Swagger at `/docs` in dev)
- **Health checks:** `${API_URL}/health` and `${API_URL}/health/ready`

### 6.2 Endpoint inventory (customer)

These endpoints exist now, confirmed by reading `app/api/v1/*.py`. Full shapes are in the OpenAPI spec; this list exists for build planning.

**Auth & account (`/api/v1/auth`, `/api/v1/me`):**
- `POST /auth/otp/request` — issue OTP
- `POST /auth/otp/verify` — verify, get token pair
- `POST /auth/refresh` — rotate refresh
- `POST /auth/logout` — revoke
- `POST /auth/register` — dev convenience (email + password + phone)
- `POST /auth/login` — dev convenience (email + password)
- `GET /me`, `PATCH /me`
- `GET /me/addresses`, `POST /me/addresses`, `PATCH /me/addresses/{id}`, `DELETE /me/addresses/{id}`

**Storefront (`/api/v1/categories`, `/products`, `/symptoms`, `/branches`, `/search`):**
- `GET /categories` — full tree
- `GET /categories/{slug}` — detail + breadcrumb
- `GET /categories/{slug}/products` — paginated, filterable, sortable
- `GET /symptoms` — list
- `GET /symptoms/{slug}/products`
- `GET /products/{slug}` — full detail
- `GET /products/{slug}/related` — substitutes (≤4)
- `GET /branches`
- `GET /search?q=&lang=&page=`
- `GET /search/suggest?q=&lang=`

**Cart (`/api/v1/cart`):**
- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/{id}`
- `DELETE /cart/items/{id}`
- `POST /cart/clear`

Cart works for guests (cookie `pharmacy_cart_session`) and for logged-in users.

**Checkout (`/api/v1/checkout`):**
- `POST /checkout/quote` — totals + diffs
- `POST /checkout/place` — REQUIRED `Idempotency-Key` header

**Orders (`/api/v1/me/orders`):**
- `GET /me/orders`
- `GET /me/orders/{order_number}`
- `GET /me/orders/{order_number}/status` — slim, for polling
- `POST /me/orders/{order_number}/cancel`
- `POST /me/orders/{order_number}/reorder`

### 6.3 The Idempotency-Key contract

`POST /checkout/place` (and admin refunds) require an `Idempotency-Key` header. The frontend generates a UUID v4 per submission attempt (the same key on retry) and includes it. Re-submitting the same key with the same body returns the same response; same key with different body returns 409.

### 6.4 Cookies and CORS

- **Customer:** Bearer JWT in `Authorization` header. The cart cookie `pharmacy_cart_session` is HttpOnly, set by the backend, automatically sent on requests.
- **Admin:** session cookie `admin_session`, HttpOnly, Secure (production), SameSite=Lax.
- **CORS:** backend's `CORS_ORIGINS` must include `https://storefront.nookat.kg` and `https://admin.nookat.kg` plus localhost variants for dev. The frontend doesn't enable CORS itself; the backend does.
- Always pass `credentials: 'include'` when calling endpoints that involve cart cookie (storefront) or session cookie (admin). For pure JWT-protected calls, `credentials: 'omit'` is fine but `'include'` is harmless.

---

## 7. Type generation from OpenAPI

### 7.1 Why generate

The backend's Pydantic models change. Hand-maintained TypeScript types drift. We let `openapi-typescript` consume `${API_URL}/openapi.json` and emit `generated/api.d.ts` — the single source of truth for response shapes.

### 7.2 The pipeline

```bash
# package.json scripts
"types:generate": "openapi-typescript ${API_URL}/openapi.json -o generated/api.d.ts",
"types:check": "git diff --exit-code generated/api.d.ts || (echo 'API types out of date — run pnpm types:generate' && exit 1)"
```

CI runs `types:check`. Drift between the frontend's generated types and a fresh fetch fails the build — forcing the developer to re-generate and commit.

### 7.3 Using the types

```ts
// lib/api/client.ts
import createClient from "openapi-fetch"
import type { paths } from "@/generated/api"

export const apiClient = createClient<paths>({ baseUrl: process.env.API_URL })

// In a route or component:
import { apiClient } from "@/lib/api/client"

const { data, error } = await apiClient.GET("/api/v1/products/{slug}", {
  params: { path: { slug: "panadol-500mg" }, query: { lang: "ru" } },
})
// data is StorefrontProductDetail (typed)
// error is the API error envelope (typed)
```

### 7.4 Type aliases for sanity

Generated types are deeply nested. We re-export friendlier names:

```ts
// lib/api/types.ts
import type { components } from "@/generated/api"

export type ProductDetail = components["schemas"]["StorefrontProductDetail"]
export type ProductCard = components["schemas"]["StorefrontProductCard"]
export type CartRead = components["schemas"]["CartRead"]
export type OrderRead = components["schemas"]["OrderRead"]
export type CategoryNode = components["schemas"]["CategoryNode"]
// ...
```

Components consume these aliases, never the deep `components["schemas"]["..."]` paths.

### 7.5 What about Zod?

Generated TS types are great for compile-time. For runtime parsing (e.g., when consuming an unknown body in a webhook), we generate Zod schemas via `openapi-zod-client` into `generated/zod-schemas.ts`. Used sparingly — most fetches go through `openapi-fetch` which handles the round-trip. Forms use hand-written Zod schemas because UI validation is its own contract.

---

## 8. Authentication & sessions

### 8.1 Customer auth — JWT bearer

Per the backend (`app/api/v1/auth.py`) and `DESIGN §17.7` confirmation: 30-day refresh tokens, 15-minute access tokens, refresh rotation with `jti` revocation in Redis.

**Token storage:**

- **Access token** in **memory only** (Zustand store, no persistence). Lost on full reload — refreshed silently on next request.
- **Refresh token** in **HttpOnly, Secure, SameSite=Lax cookie** named `nookat_refresh`. Set by a tiny route handler (`/api/auth/set-tokens`) that proxies the backend's response into a cookie. The frontend never reads the refresh token JS-side — only the route handler at our origin can. This is the OWASP-recommended pattern for SPA refresh tokens.

**Why not localStorage:**
- XSS exposure for refresh token (long-lived) is unacceptable.
- HttpOnly cookie can't be read by injected scripts.
- The access token in memory is short-lived enough that XSS exposure during its lifetime is a smaller risk; the bigger problem is XSS itself, which we address with CSP.

**Why not session cookie for everything:**
- Backend is set up for JWT bearer for customers. Sticking to its contract.
- Mobile app future-proofing — JWT works everywhere.

### 8.2 Customer auth — flow

```
1. POST /api/v1/auth/otp/request { phone }
2. POST /api/v1/auth/otp/verify { phone, code }
   → { access_token, refresh_token, expires_in }
3. Frontend route handler /api/auth/set-tokens stores refresh in cookie.
4. In-memory access token used for subsequent API calls (Authorization header).
5. On 401, attempt /api/auth/refresh-tokens
   → calls /api/auth/refresh with cookie-stored refresh
   → returns new pair, updates cookie + memory
6. On refresh failure, clear cookie + memory, redirect to login.
```

### 8.3 Silent refresh implementation

In `lib/api/client.ts`, an axios-style retry interceptor (using openapi-fetch's middleware):

```ts
const refreshOnUnauthorized: Middleware = {
  async onResponse({ response, request }) {
    if (response.status !== 401) return response
    if (request.url.includes("/auth/")) return response // don't loop on auth itself

    const refreshed = await fetch("/api/auth/refresh-tokens", { method: "POST" })
    if (!refreshed.ok) {
      window.location.href = "/auth/otp"
      return response
    }
    const { access_token } = await refreshed.json()
    setAccessToken(access_token)
    // Retry original request with new token
    return fetch(request.clone(), {
      headers: { ...Object.fromEntries(request.headers), Authorization: `Bearer ${access_token}` },
    })
  },
}
```

A single in-flight refresh is shared across concurrent 401s to avoid thundering herds.

### 8.4 Auth gates

Two patterns:

- **Soft gate (most pages):** unauthenticated users can browse. The cart and search work. Login wall appears only at "Place order" (PRODUCT §7.1).
- **Hard gate (account, orders, addresses):** middleware redirects to `/auth/otp` if no valid access token.

Implementation: Next.js `middleware.ts` checks for the refresh cookie and access token freshness; redirects if hard-gated route is accessed without them.

### 8.5 Admin auth — server-side session

Different repo, different pattern.

- `POST /api/admin/v1/auth/login { email, password, totp_code? }` returns 200 + sets `admin_session` cookie (HttpOnly, Secure, SameSite=Lax, ~12h).
- All subsequent admin requests automatically send the cookie.
- Logout: `POST /api/admin/v1/auth/logout`.
- Frontend doesn't manage tokens — the cookie is the auth.
- `middleware.ts` in admin checks for the cookie's presence (we can't read its value but we can detect presence) and redirects to `/login` if missing. Real auth check happens server-side via the API, which 401s if invalid.

### 8.6 Logout

- **Customer:** clear in-memory access, clear refresh cookie via route handler that calls `POST /auth/logout`, redirect to homepage.
- **Admin:** call `POST /admin/auth/logout`, redirect to login.
- Both clear local Zustand stores.

---

## 9. Routing strategy

### 9.1 Storefront — locale-prefixed App Router

```
/                     → redirect to /ru
/ru                   → homepage RU
/ru/categories        → category index
/ru/categories/cold-and-flu
/ru/categories/cold-and-flu/products
/ru/products/panadol-500mg
/ru/symptoms/headache
/ru/cart
/ru/checkout
/ru/auth/otp
/ru/account
/ru/account/addresses
/ru/orders
/ru/orders/PH-2026-000123
/ru/search?q=паракет
/ru/terms ... etc.

/ky/...               → same tree in Kyrgyz
/en/...               → same tree in English
```

Locale resolution priority (matches backend's `Accept-Language` resolver):

1. URL prefix (`/ky` wins).
2. User preference if logged in (`User.preferred_language`).
3. Cookie `NEXT_LOCALE` if set.
4. `Accept-Language` header.
5. Default: `ru`.

### 9.2 Server Components by default

Next.js 15 App Router uses Server Components by default. We lean into this:

- Most pages are RSC: catalog, search results, product detail, category, symptom, branches, account, orders.
- Client components are explicit (`"use client"`) and limited to:
  - Cart store interactions
  - Forms with rich validation (checkout, addresses)
  - Search input with debounced suggest
  - Filter sheets, dropdowns, modals
  - OTP input with paste and auto-advance
- `loading.tsx` and `error.tsx` per route segment.

### 9.3 Streaming

- RSC streaming on by default. Suspense boundaries at meaningful seams (above-the-fold content first; substitutes block below the fold).
- For PDP: stream the product header (image, name, price, CTA) eagerly; suspend on the substitutes block (not blocking conversion).

### 9.4 Cache and revalidation

- Static-ish data (categories tree, product detail) uses `revalidate = 300` (5 minutes) on Next's data cache. Backend already caches; this is a thin extra layer.
- Cart and orders are always dynamic (`force-dynamic`).
- Webhook-driven invalidation (Phase 1.5+) — backend POSTs to `/api/revalidate` on product/category mutations. We tag responses with cache tags (`['categories']`, `['product:abc']`) and `revalidateTag()` on hit.

### 9.5 Admin routing

Single-language; flat `/admin/...` tree. `middleware.ts` enforces auth across all routes except `/login`. RSC + streaming used liberally; tables are client components for sort/filter UX.

---

## 10. Data fetching

### 10.1 Three patterns by surface

| Surface | Pattern |
|---|---|
| RSC pages (catalog browse, PDP, search results, account read pages) | Server-side fetch in the component, render HTML |
| Client mutations (cart add, checkout submit, address create) | TanStack Query mutations from client components |
| Polling (order status) | `useQuery` with `refetchInterval` capped at 60s, stops on terminal status |

### 10.2 Server-side fetcher (RSC + route handlers)

`lib/api/server.ts` wraps `openapi-fetch` with:

- Reads the access token from request cookies (set by route handler, mirrored from refresh exchange) — actually, RSC can't refresh itself easily, so unauthenticated RSC pages don't include the bearer; user-specific data triggers a client component for the gated portion.
- Adds `Accept-Language` header from the locale segment.
- Applies a 10s timeout.
- Returns `{ data, error }` shape.

### 10.3 Client-side fetcher

`lib/api/client.ts` wraps `openapi-fetch` with:

- Reads access token from in-memory Zustand store.
- Refresh interceptor (§8.3).
- Sentry breadcrumb on every request.
- Attaches `X-Request-ID` header from a per-page UUID for log correlation.

### 10.4 TanStack Query setup

Single `QueryClient` per app instance, hydrated from RSC. Defaults:

```ts
{
  queries: {
    staleTime: 60_000,           // 1 minute
    gcTime: 5 * 60_000,          // 5 minutes
    refetchOnWindowFocus: false, // pharmacy customers don't tab around
    retry: (failureCount, error) => {
      if (error.status >= 500) return failureCount < 2
      return false
    },
  },
}
```

### 10.5 Mutations

```ts
const addToCart = useMutation({
  mutationFn: (input: { product_id: string; quantity: number }) =>
    apiClient.POST("/api/v1/cart/items", { body: input }),
  onSuccess: (data) => {
    queryClient.setQueryData(["cart"], data)
    showToast({ kind: "success", body: t("cart.added") })
  },
  onError: (err) => mapApiError(err),
})
```

### 10.6 Optimistic updates

- **Cart quantity changes** — optimistic. Roll back on error.
- **Cart item removal** — optimistic.
- **Address default toggle** — optimistic.
- **Place order** — never optimistic. The transaction is too consequential.
- **Order cancel** — never optimistic.

---

## 11. State management

### 11.1 Three buckets

1. **Server state** → TanStack Query. Nothing else.
2. **URL state** → searchParams. Filters, pagination, sort.
3. **Local UI state** → Zustand store, scoped narrowly.

### 11.2 Zustand stores

Each store is a single file in `lib/<concern>/store.ts`. We resist the "one big store" temptation.

- `lib/cart/store.ts` — local cart UI hints (drawer open/closed, last-added flash). The cart data itself is server state via Query.
- `lib/auth/store.ts` — in-memory access token, current user (hydrated on first /me fetch).
- `lib/ui/store.ts` — global UI: language switcher state, mobile nav open/closed.
- `lib/checkout/store.ts` — multi-step checkout state if we end up needing it (MVP is single-page; this stays empty unless required).

### 11.3 No Redux

Redux Toolkit is excellent but overkill for this product. Zustand + Query covers everything.

---

## 12. Forms and validation

### 12.1 Stack

`react-hook-form` + `Zod` + `zodResolver`. Every form has:

1. A Zod schema in `<form>/schema.ts`.
2. A typed React component using `useForm<z.infer<typeof Schema>>`.
3. Inline error display below each field.
4. Submit calls `apiClient.POST/PATCH` and maps API errors to RHF errors via `setError`.

### 12.2 Phone field

Critical pattern (per DESIGN §13.3):

```ts
const phoneSchema = z.string().refine(
  (v) => parsePhoneNumberFromString(v, "KG")?.isValid() ?? false,
  { message: "phone.invalid" } // i18n key, not a literal
)
```

The component renders `+996 ...` with auto-formatting on blur. Submit normalizes to E.164.

### 12.3 OTP field

Six 1-digit boxes; auto-advance; paste-aware. Implemented as a single component `<OtpInput length={6} />` using a `useState` array and refs.

### 12.4 Server error mapping

When a `POST /checkout/place` returns 409 with `code: "out_of_stock"`, the frontend:

1. Reads the `code` from the ProblemDetails body.
2. Looks up the i18n message: `t(`error.${code}`)`.
3. If the error has `details` (e.g., conflicting items), surfaces them inline.
4. Sets the form error and disables the submit until resolved.

### 12.5 Idempotency keys for forms

Forms that POST critical state (place order, refund) generate a UUID once on mount and reuse it across retries. New attempt = new key. Pattern:

```ts
const [idempotencyKey] = useState(() => crypto.randomUUID())
// passed as Idempotency-Key header
```

---

## 13. Internationalization

### 13.1 next-intl setup

Three locales declared in `i18n/config.ts`:

```ts
export const locales = ["ru", "ky", "en"] as const
export const defaultLocale = "ru"
```

Routes are `[locale]` segments. `next-intl/middleware` handles redirect-to-default and locale negotiation per the rules in §9.1.

### 13.2 Message files

`messages/ru.json`, `messages/ky.json`, `messages/en.json`. Same key shape as the backend's `app/i18n/<lang>.json` for parity.

The frontend keys are a **superset** of the backend's keys: backend keys cover SMS templates and error codes; frontend adds UI-only keys (`nav.home`, `cta.add_to_cart`, etc.).

We commit to keeping backend keys synced — when backend adds a key, frontend mirrors it; when frontend adds a UI key, it stays UI-only.

### 13.3 Server vs client translation

- RSC: `getTranslations` from next-intl.
- Client components: `useTranslations` hook.
- ICU MessageFormat for plurals and variables: `t("checkout.free_delivery_hint", { amount })` resolves placeholders.

### 13.4 Locale-aware formatters

`lib/format/price.ts`, `lib/format/date.ts`, `lib/format/number.ts` accept a locale and return formatted strings:

```ts
formatPrice(1250, "ru") // "1 250 сом"
formatPrice(1250, "en") // "1,250 KGS"
formatDate(new Date(), "ru") // "DD.MM.YYYY"
```

### 13.5 Brand name in translations

`messages/<lang>.json` has:

```json
{
  "brand.name": "Nookat",
  "brand.tagline": "Аптека, которой доверяют",
  ...
}
```

Components use `t("brand.name")` rather than hardcoding "Nookat." Combined with `lib/brand.ts` constants for non-translation contexts (HTML `<title>`, OpenGraph), the rename protocol from DESIGN §20 holds.

---

## 14. Error handling

### 14.1 Error taxonomy (mirrors backend's RFC 7807)

Backend returns ProblemDetails:

```json
{
  "type": "about:blank",
  "title": "Validation error",
  "status": 400,
  "detail": "Invalid input",
  "code": "validation_error",
  "context": { "field": "phone" }
}
```

The frontend:

1. Parses the `code` (machine-readable, stable).
2. Resolves the message via `t(`error.${code}`)` with fallback to `t("error.generic")`.
3. Displays per the DESIGN §14.3 pattern (inline / block / page).

### 14.2 ApiError class

```ts
// lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public context?: Record<string, unknown>,
  ) { super(code) }

  // for React Error Boundaries
  toString() { return `${this.code} (HTTP ${this.status})` }
}

export function parseApiError(response: Response, body: unknown): ApiError {
  // ... extract from ProblemDetails shape
}
```

### 14.3 Boundaries

- **Route-level:** Next.js `error.tsx` per segment. Catches React render errors and uncaught promise rejections.
- **Form-level:** React Hook Form's `setError` for field errors; component-local error state for form errors.
- **Component-level:** custom `<ErrorBoundary fallback={<ErrorState/>}>` for non-route boundaries (e.g., the substitutes block on PDP can fail without breaking the page).

### 14.4 Toasts vs blocks

| Trigger | Treatment |
|---|---|
| API call failure (network, 5xx) | Toast (retryable) |
| Form validation error | Inline below field |
| 401 (no auth) | Silent refresh, then redirect to login |
| 403 (forbidden) | Page-level message |
| 404 (resource not found) | `not-found.tsx` |
| 409 (out of stock, idempotency conflict, price changed) | Inline modal or contextual block — the user must resolve |
| Render error | Route error boundary |

### 14.5 The phone CTA in error states

Every error state of consequence offers the customer support phone number. Per DESIGN §15.5: "the person on the other end" rule.

---

## 15. Caching strategy

### 15.1 Three layers

1. **Backend Redis** — already cached server-side per BACKEND §17 (categories tree 1h, product detail 5m, search suggest 60s).
2. **Next.js Data Cache** — RSC `fetch()` calls cache by URL by default. We set `revalidate` per surface.
3. **TanStack Query client cache** — in-browser cache after hydration; staleTime 60s default.

### 15.2 Per-surface settings

| Surface | Backend cache | Next cache | Query staleTime |
|---|---|---|---|
| Categories tree | 1h | 5m revalidate | 5m |
| Category detail | 5m | 1m revalidate | 1m |
| Category products list | none | 30s revalidate | 30s |
| Product detail | 5m | 1m revalidate | 5m |
| Search results | none | no cache (URL-driven) | 30s |
| Search suggest | 60s | no cache | 30s |
| Cart | none | no cache | always fresh |
| Orders | none | no cache | 30s, polling 60s for active |

### 15.3 Cache invalidation on mutation

On client-side mutations (cart add, address update), we invalidate Query keys aggressively:

```ts
queryClient.invalidateQueries({ queryKey: ["cart"] })
```

Server-side cache invalidation via revalidation tags (Phase 1.5+) when backend admin mutations should bust frontend caches.

---

## 16. Image handling

### 16.1 Next.js Image

Use `next/image` for all rasters. Configure `next.config.ts` `images.remotePatterns` to allow:

- `${API_URL}/static/images/**` (backend's local images served via FastAPI in MVP)
- `${R2_PUBLIC_BASE}/**` (Cloudflare R2 once vendor docs land — Q15 in backend)

### 16.2 Sizes

`next/image` `sizes` attribute matches the responsive grid:

```tsx
<Image
  src={imageUrl}
  alt={alt}
  fill
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
  className="object-cover"
/>
```

### 16.3 Backend's image variants

Backend produces 200/600/1200 WebP variants (BACKEND `process_image_upload` job, gated on Q15). The schema returns `thumbnail_url`, `medium_url`, `large_url`. We use them:

- Card / list: `thumbnail_url` (200) or `medium_url` (600) for retina
- PDP main: `large_url` (1200)
- PDP carousel: same

### 16.4 Empty-state

When `image.url` is null or 404s, `<ProductImage />` falls back to the brand pill SVG (per DESIGN §8.4).

### 16.5 LCP optimization

The first hero image and the homepage's first product card are `priority`. Everything else lazy-loads.

---

## 17. Performance budgets

Mobile-first, Bishkek/Nookat connectivity reality (3G to 4G LTE, mid-range Android the median device).

### 17.1 Targets

| Metric | Customer | Admin |
|---|---|---|
| LCP | ≤ 2.5s on Slow 3G | ≤ 3s on cable |
| FCP | ≤ 1.8s on Slow 3G | — |
| TTI | ≤ 3.5s on mid-range Android | ≤ 4s |
| CLS | ≤ 0.1 | ≤ 0.1 |
| INP | ≤ 200ms | ≤ 200ms |
| Total JS gzip per route | ≤ 180 KB | ≤ 350 KB |
| Total CSS | ≤ 50 KB | ≤ 80 KB |

### 17.2 Tactics

- RSC by default — server-rendered HTML reduces client JS.
- Route-level code splitting (App Router default).
- Dynamic import for heavy client-only widgets (search-suggest, filter sheet).
- shadcn/ui adds zero runtime; only the components we copy ship.
- Tailwind purges aggressively (only used classes ship).
- `next/font` for Inter (no flash, no external CDN call).
- No global polyfills; ES2022 target.
- Image lazy loading + responsive sizes.

### 17.3 CI gate

GitHub Actions runs Lighthouse on PRs against a deployed preview. Budgets enforced; PR fails on red.

---

## 18. Security

### 18.1 OWASP-aligned

- **CSP** strict by default. Inline scripts forbidden except Next's framework runtime (which Next handles via nonce). Inline styles allowed for design tokens at the `<head>` level.
- **HSTS** via reverse proxy (Caddy/Traefik).
- **HttpOnly + Secure + SameSite** on every cookie we set or touch.
- **No PII in localStorage.** Refresh token in HttpOnly cookie only.
- **No tokens in URL.** Ever.

### 18.2 XSS hardening

- React escapes by default — never use `dangerouslySetInnerHTML` except for known-safe content (e.g., parsed Markdown from backend product descriptions, sanitized server-side).
- `next/image` escapes URLs.
- Input validation client-side (Zod) and server-side (backend).

### 18.3 CSRF

- For Bearer JWT calls: not vulnerable to CSRF (no automatic credential).
- For cookie-authed calls (cart cookie, admin session): SameSite=Lax cookie + `POST` requires explicit fetch from same-origin. Backend additionally validates `Origin`/`Referer` for sensitive admin mutations (per BACKEND §20).

### 18.4 Dependency hygiene

- `pnpm audit` in CI.
- Renovate or Dependabot configured.
- No deps without a real reason. Every new dep gets an entry in `DECISION_LOG.md`.

### 18.5 Brand/PII data leaks

- No customer phone, email, or address ever logged client-side except in Sentry breadcrumbs (which Sentry scrubs by default; we additionally configure `beforeSend` to redact).
- Order numbers are fine to log (they're customer-visible identifiers).

---

## 19. Observability

### 19.1 Sentry

- `@sentry/nextjs` initialized client-side and server-side.
- DSN from `SENTRY_DSN` env. No DSN = no-op (dev default).
- `release` = `nookat-storefront@<version>+<git_sha>` (matches backend pattern).
- `traces_sample_rate = 0.1`, `profiles_sample_rate = 0.1`.
- `beforeSend` strips PII from breadcrumbs (phone, email, address).

### 19.2 Web Vitals

`useReportWebVitals` in root layout reports LCP, FCP, CLS, INP, TTFB to Sentry as performance metrics.

### 19.3 Structured client logging

`lib/log.ts` thin wrapper:

```ts
log.info("cart.added", { productId, quantity })
log.warn("checkout.price_changed", { items })
log.error("api.failed", { code, status, requestId })
```

Routes to console (dev) and Sentry breadcrumbs (prod).

### 19.4 X-Request-ID propagation

Every API call from the frontend sends `X-Request-ID: <uuid>`. The backend echoes it; on errors, we log both the frontend's request_id and the backend's, allowing trace stitching across logs.

---

## 20. Testing strategy

### 20.1 Three layers

- **Unit** (Vitest) — pure functions: formatters, helpers, Zod schemas, store reducers. Target: comprehensive.
- **Component** (React Testing Library + Vitest) — components in isolation: `<ProductCard />`, `<CartLine />`, forms. Target: every meaningful state (loading, error, empty, normal).
- **E2E** (Playwright) — user journeys end-to-end against a running backend (docker-compose). Target: every PRODUCT §7 journey.

### 20.2 E2E priorities

In order of importance:

1. J-01 first-time symptom shopper — homepage → search → PDP → cart → OTP → checkout → order placed
2. J-02 repeat reorder — login → /orders → reorder → checkout
3. J-03 caregiver multi-recipient — login → checkout with different recipient
4. Admin J-04 receive stock (admin app)
5. Admin J-05 fulfill order (admin app)

### 20.3 Mock vs real backend

For E2E: real backend in docker-compose. Test data seeded via the backend's `dev/fixtures/`.

For unit/component: Mock Service Worker (`msw`) intercepts fetches. Mocks return shapes from generated types — type-safe mocks.

### 20.4 Visual regression

Playwright screenshot comparison on key surfaces (homepage, PDP, cart, checkout) at three breakpoints (mobile, tablet, desktop). Baseline committed; CI fails on diff > threshold.

### 20.5 Accessibility tests

Every component test runs `axe-core` via `@axe-core/playwright` or Vitest plugin. Zero critical violations.

### 20.6 CI matrix

```
lint
type-check
unit + component (Vitest)
build
E2E (Playwright headless, 3 browsers: chromium, firefox, webkit)
lighthouse on built preview
```

---

## 21. Code conventions

### 21.1 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- No `any`. Use `unknown` and narrow.
- No `@ts-ignore`. `@ts-expect-error` with reason if absolutely needed.
- Branded types for IDs where it helps: `type ProductId = string & { readonly __brand: "ProductId" }`.

### 21.2 React

- Prefer Server Components.
- `"use client"` only when needed; document why in a comment.
- Components are functions; no classes.
- Props are typed interfaces, not `React.FC`.
- Children are explicit `children: React.ReactNode`, not implicit.

### 21.3 Naming

- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components.
- Components: `PascalCase`.
- Hooks: `useCamelCase`.
- Constants: `SCREAMING_SNAKE_CASE`.
- Boolean props: `isX`, `hasX`, `canX`.

### 21.4 Imports

Use absolute imports via `@/` alias (configured in `tsconfig.json` paths). Group: external, then `@/`, then relative. ESLint sorts.

### 21.5 Comments

Comments explain **why**. The diff explains **what**. Comments in code call out non-obvious choices, link to spec sections, or warn about pitfalls. Comments don't restate types or rephrase function names.

### 21.6 Conventional Commits

`type(scope): subject` — same as backend. Scopes: `auth`, `cart`, `checkout`, `catalog`, `pdp`, `admin`, `i18n`, `ci`, `deps`, `infra`.

---

## 22. Build, deploy, environments

### 22.1 Environments

| Env | URL | Backend |
|---|---|---|
| local | `http://localhost:3000` | `http://localhost:8000` |
| staging | `staging.nookat.kg` | `api.staging.nookat.kg` |
| production | `nookat.kg` | `api.nookat.kg` |

Admin: `admin.nookat.kg` and `admin.staging.nookat.kg`.

### 22.2 Env variables

```
# .env.example
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BRAND_NAME=Nookat
NEXT_PUBLIC_DEFAULT_LOCALE=ru

# Server-only:
API_URL=http://localhost:8000
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
NODE_ENV=production
```

`NEXT_PUBLIC_*` exposed to client; everything else server-only. Validation via Zod on startup (`lib/env.ts`).

### 22.3 Docker

Multistage Dockerfile (Node 20-alpine):
- `deps` stage: `pnpm install --frozen-lockfile`
- `builder` stage: build with `NEXT_TELEMETRY_DISABLED=1`
- `runtime` stage: copy `.next/standalone`, run as non-root, healthcheck on `/api/health`

### 22.4 Deploy

Coolify on the same VPS as backend. Each push to `main` triggers Coolify's auto-deploy. Staging deploys from `staging` branch.

### 22.5 Production checklist

- HTTPS enforced (Caddy)
- HSTS header present (Caddy or middleware)
- Security headers (`X-Frame-Options DENY`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy minimal`)
- Sentry DSN configured
- Real `NEXT_PUBLIC_API_URL`
- CSP tested in dev with `Content-Security-Policy-Report-Only` first
- Backend CORS allows the storefront origin

---

## 23. Phased build sequence

The detailed prompts live in `FRONTEND_CLAUDE_CODE_PROMPTS.md`. Summary here for orientation.

| Phase | Goal | Builds on |
|---|---|---|
| **0 — Spec comprehension & API surveying** | Read all specs + backend repo + OpenAPI; produce master plan | — |
| **1 — Project foundation (storefront)** | Next.js 15 boot, Tailwind, shadcn init, Sentry skeleton, ESLint, Prettier, Husky, CI | 0 |
| **2 — Design system implementation** | Brand tokens in CSS vars, Tailwind theme, base components (Button, Input, etc.), brand placeholder logo | 1 |
| **3 — API client + type generation** | openapi-typescript pipeline, openapi-fetch wrapper, error parsing, env config | 1 |
| **4 — i18n foundation** | next-intl, locale routing, message JSON synced to backend, formatters | 1 |
| **5 — Auth & account** | OTP flow, refresh handling, /me, addresses CRUD | 3, 4 |
| **6 — Catalog browse (read-only)** | Homepage, categories tree, category page, symptom page, branches | 3, 4 |
| **7 — PDP & search** | Product detail, related/substitutes, search results, autocomplete suggest | 6 |
| **8 — Cart** | Cart drawer, cart page, add/update/remove, guest cart cookie | 5, 7 |
| **9 — Checkout & order placement** | Quote, place_order with idempotency, payment branching (COD + card placeholder) | 8 |
| **10 — Order history & detail** | /orders, /orders/[orderNumber], status polling, cancel, reorder | 9 |
| **11 — Hardening: SEO, perf, a11y, error states** | meta tags, JSON-LD, Lighthouse, axe pass, error boundaries, empty states polished | 10 |
| **12 — Storefront launch readiness** | Legal pages, CSP, security headers, deploy runbooks, smoke tests | 11 |
| **A1–A6 — Admin app** | Separate phased build for admin (login, orders queue, picking, catalog CRUD, inventory, reports, audit) | parallel after Phase 5 |

---

## 24. Conventions checklist

### 24.1 Architecture
- [ ] Two repos, no monorepo
- [ ] App Router, RSC default, `"use client"` justified per occurrence
- [ ] Type generation from OpenAPI in CI (drift = build fails)
- [ ] One QueryClient per app, sensible defaults
- [ ] Zustand stores narrowly scoped, one per concern

### 24.2 Code
- [ ] TypeScript strict; no `any`
- [ ] No hex / raw size literals (DESIGN tokens)
- [ ] No hardcoded user-visible strings (i18n keys)
- [ ] No literal "Nookat" (always `BRAND.name` or `t("brand.name")`)
- [ ] Conventional Commits

### 24.3 Auth & data
- [ ] Refresh token in HttpOnly cookie only
- [ ] Access token in memory only
- [ ] Idempotency-Key on every place_order call
- [ ] Silent refresh shared (no thundering herd)
- [ ] X-Request-ID on every API call

### 24.4 i18n
- [ ] Three locales (ru / ky / en)
- [ ] Backend keys mirrored in frontend messages
- [ ] Locale-aware formatters for price/date/number/phone
- [ ] `lang` attribute set; switches on locale change

### 24.5 Performance
- [ ] LCP ≤ 2.5s (Slow 3G)
- [ ] JS bundle ≤ 180 KB gz per customer route
- [ ] Lighthouse CI green on PRs
- [ ] `next/image` everywhere; `priority` on LCP image

### 24.6 Accessibility
- [ ] All interactive elements keyboard reachable
- [ ] WCAG 2.1 AA contrast
- [ ] axe clean on every component test
- [ ] Reduced motion respected
- [ ] Forms have labels, errors aria-live'd

### 24.7 Testing
- [ ] Unit on formatters/helpers/schemas
- [ ] Component tests for every meaningful state
- [ ] Playwright E2E on every PRODUCT §7 journey
- [ ] Visual regression baseline maintained
- [ ] CI runs full matrix

### 24.8 Security
- [ ] CSP set (Report-Only first, then enforce)
- [ ] HSTS, X-Frame-Options DENY, nosniff
- [ ] No PII logged client-side
- [ ] No tokens in URLs
- [ ] No `dangerouslySetInnerHTML` without sanitization

---

*Document version 1.0 — Nookat frontend blueprint. Companion to `DESIGN_BLUEPRINT.md` and `FRONTEND_CLAUDE_CODE_PROMPTS.md`.*
