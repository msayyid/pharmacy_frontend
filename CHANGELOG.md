# Changelog

All notable changes to the Nookat storefront are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.6.0] - 2026-05-04

### Added

- Phase 6 — Layout chrome (`components/layout/{Header,Footer,MobileMenu}.tsx`). Header and Footer are RSCs that read translations + cookies server-side; only the mobile menu (Sheet drawer) is a client island. Sticky h-14 mobile / h-18 desktop top bar with brand mark + desktop nav links (Categories / Symptoms / About) + search input stub + auth-aware account icon (reads `nookat_refresh` cookie via `next/headers`) + cart icon. Footer: 3-column desktop / stacked mobile, brand info + nav + legal + copyright + license + lang switcher.
- Phase 6 — Homepage RSC (`app/[locale]/page.tsx`) replaces the Phase 4 placeholder. Type-led Hero (DESIGN §8.2 Pattern A) with CTA → `/[locale]/categories` (Phase 6 plan Q1: zero broken links at phase close). Symptom grid (top 12, 2/3/4-up responsive) + featured categories (top 6, 1/2/3-up). TrustStrip with three pillars. Both fetches run in parallel via `Promise.all` so the slowest gates time-to-paint.
- Phase 6 — Categories index (`app/[locale]/categories/page.tsx`) renders `CategoryTree` against `/api/v1/categories`, recursive parent → children rendering, EmptyState fallback when the tree is empty.
- Phase 6 — Category detail (`app/[locale]/categories/[slug]/page.tsx`) folds the products grid into the same URL per Phase 6 plan Q2 (one URL, matches DESIGN §12.5 single-page anatomy). Breadcrumb (Home → Categories → trail) + h1 + description + products count + SortSelect + ProductCard grid (1/2/3/4-up responsive) + Pagination.
- Phase 6 — Symptoms index (`app/[locale]/symptoms/page.tsx`) renders `SymptomTile` grid against `/api/v1/symptoms`, ordered server-side by `sort_order`.
- Phase 6 — Symptom landing (`app/[locale]/symptoms/[slug]/page.tsx`) renders inline Home → Symptoms → name breadcrumb + h1 + product grid + Pagination. Symptom name resolution: backend has no `GET /api/v1/symptoms/{slug}` detail route (OQ-18) and the symptom-products endpoint returns products only, so the page fetches the cached symptoms list and looks the slug up.
- Phase 6 — About page (`app/[locale]/about/page.tsx`) renders the seeded branch list (per Q-1 single-branch UX, but the seed has 2 Bishkek satellite branches, both shown). Each branch card: h2 name + address with city + phone (tel:) + opening hours. License number footer. Trust strip below. EmptyState fallback when `/api/v1/branches` is empty.
- Phase 6 — Cart placeholder (`app/[locale]/cart/page.tsx`) — friendly EmptyState per Phase 6 plan R-C. Phase 8 swaps the body in place when the real cart UI lands.
- Phase 6 — `lib/api/catalog.ts` — server-only fetcher helpers wrapping the storefront catalog endpoints with per-surface `next.revalidate` windows per FRONTEND_BLUEPRINT §15.2: categories tree 5m, category detail 1m, category products 30s, symptoms 5m, symptom products 30s, branches 1h. Every helper takes `locale` as the first argument and threads it through to `createServerApiClient(locale)` so the backend receives the URL-segment locale as `Accept-Language` (R-D fix surfaced during 6B smoke — the inbound browser header is not authoritative; the URL segment is).
- Phase 6 — `lib/api/server.ts` — `createServerApiClient(locale?)` now accepts an optional locale that explicitly sets `Accept-Language` on every outbound request. Without it, the inbound browser header is forwarded as a fallback (preserves Phase 5 behavior for routes that don't know the URL locale at the fetcher layer). Logged in DECISION_LOG as Phase 6 D11.
- Phase 6 — Composed components: `Hero`, `TrustStrip` (marketing), `SymptomTile`, `CategoryCard` (featured + grid variants), `CategoryTree`, `Breadcrumb`, `Pagination` (URL-driven, page-numbered, 7-button window with ellipsis), `SortSelect` (Radix shadcn Select; URL-driven; resets `?page` on sort change to avoid mid-list surprises), `ProductCard` (default variant — square ProductImage with brand-pill fallback, name + short description, PriceTag with compare-at, StockPip sr-only when in-stock, disabled "Add to cart" CTA with localized OOS label per plan D5), `ProductImage` (next/image fill mode + brand-pill fallback in one wrapper).
- Phase 6 — `next.config.ts` `images.remotePatterns` parses `NEXT_PUBLIC_API_URL` at build time and allows `${NEXT_PUBLIC_API_URL}/static/images/**`. Dev/staging/production each match their backend host without config drift. R2 hostname is added when backend Q15 (Cloudflare R2) closes.
- Phase 6 — 41 new i18n keys across all three locales: `nav.* / home.* / category.* / symptom.* / branch.* / footer.* / pagination.* / product.add_to_cart`. Total 101 keys × 3 locales (was 60). KY/EN seeded; KY translations curated for nav/home/category/symptom/branch families with the same RU-canonical-then-best-effort policy from Q-9.
- Phase 6 — Tests: `tests/component/product-card.test.tsx` (in-stock / out-of-stock / no-image / compare-at variants), `tests/component/symptom-tile.test.tsx`, `tests/component/pagination.test.tsx` (window collapsing, prev/next disabling, aria-current). E2E: `tests/e2e/catalog-flow.spec.ts` and `tests/e2e/symptom-flow.spec.ts`, both tagged `@requires-backend` so they're filtered out of CI's no-backend run; verified locally against the seeded backend, all 10 catalog+symptom @requires-backend tests passing.
- Phase 6 — `homepage.spec.ts` updated: asserts the new chrome (header cart link, header categories link, footer present) instead of the retired "Foundation phase complete" Phase 4 placeholder text.

### Changed

- Phase 6 — `app/[locale]/layout.tsx` body becomes a flex column with `<Header />` + `<main>` + `<Footer />` so the footer hugs the bottom on short pages.
- Phase 6 — `app/providers.tsx` `NextIntlClientProvider` now sets `timeZone="Asia/Bishkek"` to match the request config and silence the `ENVIRONMENT_FALLBACK` warning that fired in CI logs (caught during the Phase 5 → Phase 6 transition; not user-visible but worth fixing).

### Notes

- **R-E (Header RSC + client island composition) held throughout.** Header is a server component reading `cookies()` via `next/headers` for the auth-aware account link; only `MobileMenu` is `"use client"` (the Sheet trigger + open state). Verified at every sub-phase boundary by build-time exit code (server-only APIs in a client component would fail compilation).
- **R-D verified end-to-end.** `/ky` homepage and `/ky/categories/<slug>` and `/ky/symptoms/<slug>` all render Kyrgyz translations where the seed provides them; Russian fallback when not (per backend's `_pick_translation` in `app/domain/catalog/storefront.py:299` — design-intent per PRODUCT §13.1 "RU is canonical"). The R-D bug surfaced during initial 6B smoke (browser-Accept-Language was being forwarded instead of the URL locale) was a frontend plumbing fix, not a backend issue. The fix lives in `lib/api/server.ts` + `lib/api/catalog.ts`.
- **OQ-22 (categories endpoint) self-resolved.** During the early 6B smoke, `GET /api/v1/categories` returned `[]` despite 6 active rows in the DB (verified via direct ORM). Survived `FLUSHALL` of Redis + uvicorn restart. After a subsequent fresh dev-server start the endpoint began returning the 6 root categories with full Cyrillic names. Likely a `cache_get_or_set` race that cached an empty-array value for the `CATEGORY_TREE_TTL=3600` window. No backend fix applied; entry kept in OPEN_QUESTIONS as a recommended audit before launch.
- **Empty-state path verified for real.** All 5 seeded products have `is_in_stock=false` at the current inventory state, so every category list-page (and every symptom landing) legitimately renders the EmptyState in this smoke. Phase 6 plan D6 explicitly accepted this: `in_stock_only=true` matches the backend default; populated-data verification re-runs at Phase 8 close once admin (Phase A1) can seed at scale.
- **Build receipts at phase close.** `pnpm lint` 0; `pnpm typecheck` 0; `pnpm test` 16 files / 139 tests passing; `pnpm i18n:check` 101 keys × 3 locales parity; `pnpm build:ci` 0; `pnpm e2e --project chromium --grep-invert @requires-backend` 13 passed 1 skipped; `pnpm e2e --project chromium --grep @requires-backend tests/e2e/{catalog,symptom}-flow.spec.ts` 10 passed.

## [0.5.0] - 2026-05-03

### Added

- Phase 5 — Auth route handlers under `app/api/auth/`: `set-tokens` (POST receives the access+refresh pair from the OTP-verify response, sets `nookat_refresh` HttpOnly + Secure-in-prod + SameSite=Lax cookie at our origin), `refresh-tokens` (POST reads the cookie, calls backend `POST /api/v1/auth/refresh`, rotates the cookie, returns the new access token + expires_in), `logout` (POST best-effort backend logout, deletes the cookie, 204). Refresh token never enters JS; access token never enters storage.
- Phase 5 — `lib/auth/refresh.ts` single-flight refresh: a module-level `inFlight` Promise dedupes concurrent 401s app-wide. On success updates `useAuthStore` + returns the new access token; on failure clears the store + returns null. Phase 3 ApiError 401 interceptor now retries against this real implementation.
- Phase 5 — `lib/auth/store.ts` Zustand store: `accessToken`, `tokenExpiresAt`, `currentUser`, `setTokens(access, expiresIn)`, `setAccessToken` alias, `setCurrentUser`, `clear`. Access token lives in memory only.
- Phase 5 — `lib/auth/return-url.ts` open-redirect-hardened sanitizer (R-F): rejects protocol-relative `//evil.com`, backslash `\\evil`, scheme-relative `https://evil.com`, `javascript:` / `data:`, and any URL whose origin doesn't match the request origin. Falls back to `/<locale>/account`.
- Phase 5 — `lib/cart/merge.ts` OQ-16 frontend workaround: `mergeGuestCartIntoUser({ guestItems, client })` sequentially re-adds guest cart items into the authenticated user's cart, returning `{attempted, added, failed[]}`. Per-item failures (`out_of_stock`, `quantity_exceeded`) don't block other items.
- Phase 5 — `components/auth/PhoneInput.tsx`: RHF-friendly forwardRef component with `+996` placeholder, libphonenumber-js KG-default formatting on blur, `type=tel` + `inputMode=tel` + `autoComplete=tel` for mobile keypad. `aria-invalid` reflects an `invalid` prop.
- Phase 5 — `components/auth/OtpInput.tsx`: 6-cell paste-aware input with auto-advance, backspace-to-prev, ArrowLeft/ArrowRight focus, paste-of-6-digits fills all cells, paste containing extra characters takes only the first 6 digits, `onComplete` fires once per full code, non-numeric typed input silently dropped, `sanitizeDigits` helper exported.
- Phase 5 — `app/[locale]/auth/otp/{schema,page}.tsx`: 2-state Client Component (PHONE → CODE). Wires `sanitizeReturnUrl` + `mergeGuestCartIntoUser` at verify success. Zod schemas use i18n keys (`error.invalid_phone`, `error.phone_required`, `error.code_required`).
- Phase 5 — `app/[locale]/account/page.tsx` profile view (`useQuery` for `/me`, `useMutation` for logout) and `app/[locale]/account/profile-form.tsx` (RHF + Zod for `PATCH /me` over `first_name`, `last_name`, `email`, `preferred_language`; phone read-only per Q-8).
- Phase 5 — `app/[locale]/account/addresses/{page,address-form}.tsx`: TanStack Query CRUD with create/edit Sheet + delete-confirm Dialog (no `confirm()`/`alert()`); cap at 10 addresses per F-ACC-002; `is_default` toggle PATCHes the row, backend handles exclusivity. `components/address/AddressCard.tsx` filled-in skeleton from Phase 2.
- Phase 5 — `middleware.ts` composes the next-intl middleware with an auth gate. HARD_GATED routes: `/[locale]/{account,orders,me}/...`. Unauthenticated requests redirect to `/[locale]/auth/otp?return=<sanitized-current-path>`. Synchronous wrapping because next-intl 4.11 returns a sync `(req: NextRequest) => NextResponse`.
- Phase 5 — `app/providers.tsx` (`AppProviders`) wrapping `QueryClientProvider` + `NextIntlClientProvider` + `TooltipPrimitive.Provider`. Stable QueryClient identity via `useState` + factory. TanStack Query defaults: 60s staleTime, 5min gcTime, no `refetchOnWindowFocus`, retry only 5xx (max 2) + 1 retry on network error.
- Phase 5 — 10 new i18n keys across all three locales: `auth.otp.resend_in`, `auth.otp.return_to_phone`, `error.invalid_otp`, `error.wrong_code`, `error.too_many_attempts`, `error.not_found_or_expired`, `error.rate_limited`, `error.phone_required`, `error.invalid_phone`, `error.code_required`. Total now 60 keys per locale.
- Phase 5 — `i18n/unflatten.ts` + integration into `i18n/request.ts`: converts the on-disk flat-dotted JSON (Phase 4 D2 backend-mirror shape) into a nested object before handing to next-intl. next-intl 4.x treats `.` as a path separator in `t(key)`, so `t("auth.otp.title")` was failing against flat keys. Discovered Phase 5F via Playwright web-server logs; the JSON shape is preserved (so backend parity holds), the conversion happens once per request at the edge of next-intl. Also sets a global `timeZone: "Asia/Bishkek"` to silence the `ENVIRONMENT_FALLBACK` markup-mismatch warning.
- Phase 5 — Tests: `tests/component/phone-input.test.tsx` (paste/format-on-blur, KG default region, type=tel, aria-invalid, placeholder), `tests/component/otp-input.test.tsx` (auto-advance, paste-fill, backspace-jump, arrow keys, onComplete fires once per full code + re-fires after refill, non-numeric drop), `tests/unit/refresh-single-flight.test.ts` (200 sets tokens, 401 clears, network fails to null, 5 concurrent calls share ONE round-trip, sequential calls trigger separate round-trips, posts to `/api/auth/refresh-tokens` with `credentials: same-origin`), `tests/unit/return-url.test.ts` (open-redirect attack vectors), `tests/unit/cart-merge.test.ts` (empty no-op, full re-add, partial failure with `out_of_stock`, network errors as `unknown_error`), `tests/unit/unflatten.test.ts` (single key, namespace merge, root-level keys, collision throws, deep keys).
- Phase 5 — E2E: `tests/e2e/account-gate.spec.ts` verifies the middleware redirects unauthenticated users from `/[locale]/{account,account/addresses,orders,me}` to `/[locale]/auth/otp?return=<encoded path>` and leaves the homepage and `/[locale]/auth/otp` itself reachable. `tests/e2e/auth-flow.spec.ts` tagged `@requires-backend` drives the full OTP loop against a live backend (request → fish OTP code from backend log → verify → /account → logout → re-protect); gated out of CI default by tag.

### Changed

- Phase 5 — `app/[locale]/layout.tsx` now wraps children in `<AppProviders>` (was a bare passthrough in Phase 4).
- Phase 5 — `lib/api/client.ts` 401 interceptor: the Phase 3 `refreshAccessToken()` stub now resolves to the real single-flight implementation; pathname check for `/api/v1/auth/*` retained so refresh requests don't recurse.

### Notes

- **OQ-16 (backend cart-merge endpoint missing).** The frontend ships the sequential re-add workaround now; the empty-list path is wired in Phase 5D (no items yet → no-op). Phase 8 plumbs the real guest cart. The DECISION_LOG entry stays open until backend exposes `POST /api/v1/cart/merge` and we delete `lib/cart/merge.ts`.
- **R-A preempted (third time).** next-intl 4.11 `createMiddleware` returns a synchronous `(req: NextRequest) => NextResponse`; composing the auth gate as a sync wrapper around the next-intl response works cleanly, no async coordination needed.
- **R-E (refresh cookie rotation race in multi-tab) — accepted, deferred to Phase 11.** If Tab A and Tab B both 401 simultaneously, the slower tab's refresh fails (rotated refresh token already consumed by the faster tab) and that tab silently logs out. Single-tab is the supported MVP scenario. DECISION_LOG carries the full context so a future "I opened two tabs and got logged out" report doesn't read as a regression.
- **R-F (open-redirect via `?return=`)** — sanitizer covers protocol-relative, scheme-relative, backslash, `javascript:` / `data:`, and cross-origin URLs. `tests/unit/return-url.test.ts` enumerates the attack vectors.
- **i18n flat-key bug surfaced and fixed in 5F.** Latent since Phase 4 D2 — the homepage tests didn't exercise `t()` with dotted keys, so Phase 4's CI green was a false-green for the i18n pipeline. The OTP page was the first place `t("auth.otp.title")` ran, and Playwright's web-server log surfaced the `MISSING_MESSAGE` errors. `i18n/unflatten.ts` is the fix; behavioral test coverage is now in `tests/unit/unflatten.test.ts`.
- **Build receipts at phase close.** `pnpm lint` 0 errors; `pnpm typecheck` 0 errors; `pnpm test` 13 files / 123 tests passing; `pnpm i18n:check` 60 keys × 3 locales parity; `pnpm build:ci` 0; `pnpm e2e --project chromium --grep-invert @requires-backend` 13 passed, 1 skipped.

## [0.4.0] - 2026-05-03

### Added

- Phase 4 — `next-intl@4.11` + `libphonenumber-js@1.12` + `date-fns@4.1` installed.
- Phase 4 — Locale-prefixed routing per D1: `/`, `/ru/...`, `/ky/...`, `/en/...`. The next-intl middleware redirects `/` → `/<negotiated-locale>` (Accept-Language → URL prefix → cookie persistence). All rendered pages live under `app/[locale]/` — there is no `app/layout.tsx`; `app/[locale]/layout.tsx` provides `<html lang>` + `<body>` + `next/font` + `NextIntlClientProvider` + `<TooltipPrimitive.Provider>`. Route handlers (`/api/health`, `/api/diag`) stay layout-free per Next.js convention.
- Phase 4 — `i18n/config.ts` (locales tuple + defaultLocale + Locale type) and `i18n/request.ts` (`getRequestConfig` with `hasLocale` guard + dynamic message-file import).
- Phase 4 — `middleware.ts` configured with `localePrefix: "always"` + `localeDetection: true`. Matcher excludes `/api`, `/_next`, static files, favicon. Phase 5 will compose auth-gate logic on top.
- Phase 4 — `next.config.ts` wraps with `createNextIntlPlugin('./i18n/request.ts')`.
- Phase 4 — `messages/{ru,ky,en}.json`: 50 keys per locale with **dotted-flat shape mirroring the backend's `app/i18n/<lang>.json` exactly** (per D2 + the user's Phase 4 reminder: backend keys are dotted, not nested objects). Mirrored 43 keys verbatim from backend (sms.\* family excluded — server-only); added 4 FE-only keys (`brand.{name,about,tagline}` + `ui.locale.{ru,ky,en,switch_to}`). Backend error code `code` field passes straight through to `t(\`error.\${code}\`)` with zero translation drift.
- Phase 4 — `lib/format/{price,date,number,phone}.ts` locale-aware formatters: `formatPrice` (ru/ky → "1 250 сом" with thin-space U+2009 thousands + comma decimal + lowercase сом suffix; en → "1,250 KGS"), `formatDate` (DD.MM.YYYY for ru/ky, DD/MM/YYYY for en), `formatNumber` (locale-aware Intl wrap), `formatPhoneE164` / `formatPhoneDisplay` / `isValidPhone` (libphonenumber-js with `KG` default region matching the backend's `phonenumbers` config).
- Phase 4 — `components/product/PriceTag.tsx` refactored to call `formatPrice` from `lib/format/price.ts` instead of its own inline `Intl.NumberFormat` (Phase 2 had the inline placeholder per its plan).
- Phase 4 — `components/i18n/LangSwitcher.tsx`: compact pill switcher (RU/KY/EN). `aria-current="true"` on active option; manual path swap via `pathname.replace(/^\/[a-z]{2}/, ...)` so the URL prefix moves while the rest of the path is preserved; clicking the active locale is a no-op.
- Phase 4 — `scripts/i18n-check.mjs` + `pnpm i18n:check` script + new CI `i18n-check` job. Asserts every key exists in all three locale files; exits non-zero on drift with a readable list of missing keys.
- Phase 4 — `tests/unit/formatters.test.ts` (~25 cases: price/date/number/phone variants for all three locales + edge cases).
- Phase 4 — `tests/component/lang-switcher.test.tsx` (6 cases: 3-pill rendering, aria-current/disabled on active, path-swap behaviour with nested paths, no-op on active click, bare /ru → /en swap).
- Phase 4 — `tests/e2e/homepage.spec.ts` extended: `/` redirects to a locale-prefixed URL (locale-agnostic to handle browser Accept-Language variation), `/ru` direct navigation pins subsequent `/` visits to /ru via cookie, `/ky` and `/en` direct entries assert correct `<html lang>`.
- Phase 4 — `tests/e2e/kitchen-sink-visual.spec.ts` updated to the new `/ru/kitchen-sink` URL after route restructure.

### Changed

- Phase 4 — Routes restructured under `[locale]`: `app/page.tsx` → `app/[locale]/page.tsx`; `app/(dev)/kitchen-sink/*` → `app/[locale]/(dev)/kitchen-sink/*`; deleted `app/layout.tsx` (`[locale]/layout.tsx` is the de-facto root for all rendered routes). R-A from the Phase 4 plan was preempted: Next 16 accepts the no-root-layout pattern.
- Phase 4 — ESLint flat config gained a `scripts/**/*.{js,mjs,cjs}` block with Node globals so `console` and `process` resolve in `i18n-check.mjs` without polluting the React/JSX rule set.

### Notes

- **Backend i18n parity.** Verified at phase close: every key in `pharmacy_backend/app/i18n/{ru,ky,en}.json` outside the `sms.*` server-only family appears in our `messages/<lang>.json` with the same dotted-flat key name and identical RU/KY/EN values. When the backend emits a ProblemDetails `code` field, `t(\`error.\${code}\`)` resolves correctly across all three locales.
- **`middleware.ts` deprecation.** Next 16 prints `The "middleware" file convention is deprecated. Please use "proxy" instead.` Logged as `RISKS.md R-13`. next-intl 4.11 still ships `next-intl/middleware`; we keep the current shape until next-intl publishes a `proxy.ts` migration path.
- **Q-9 KY/EN seed.** All three locales fully populated. Backend-mirrored keys are human-curated (PRODUCT §21.2). `ui.*` and `brand.*` FE-only keys seeded for KY/EN; flagged for the existing pre-launch backlog item (KY pharmacist review + EN human review).
- **R-A preempted.** Spec layout shape (`<html>+<body>` in `[locale]/layout.tsx`, no `app/layout.tsx`) compiles and serves correctly under Next 16; no fallback needed.
- **R-B preempted.** date-fns has no `ky` locale; KY uses RU's `DD.MM.YYYY` per DESIGN §18.2 — visible difference is zero.

## [0.3.0] - 2026-05-03

### Added

- Phase 3 — Typed API client pipeline: `openapi-typescript@7.13` + `openapi-fetch@0.17` + `zod@4.4` + `zustand@5.0`.
- Phase 3 — `generated/api.d.ts` (6,455 lines) auto-generated from the backend's OpenAPI schema. Compiles cleanly under `exactOptionalPropertyTypes: true` on first generation — R-A risk preempted, no patches needed.
- Phase 3 — `openapi.json` snapshot at the repo root (144,696 bytes, captured against `pharmacy_backend@v1.0.0-rc1` running locally). CI regenerates types from the snapshot and diffs against the tracked `generated/api.d.ts`. Backend version bumps land via `feat(api): regenerate types from backend@<sha>` commits that update both files together.
- Phase 3 — `lib/api/types.ts` re-exports 26 friendly aliases over the deeply nested `components["schemas"]["..."]` paths: `ProductDetail`, `ProductCard`, `ProductsPage`, `CategoryNode`, `CategoryDetail`, `Symptom`, `Branch`, `SearchResults`, `SuggestResponse`, `CartRead`, `CartItemRead`, `CartTotalsRead`, `CheckoutQuote`, `PlaceOrderRequest`, `PlaceOrderResponse`, `OrderRead`, `OrderListItem`, `OrderStatusRead`, `ReorderResponse`, `UserMe`, `UserMeUpdate`, `Address`, `AddressCreate`, `AddressUpdate`, `TokenPair`, `OtpRequestOut`. Components consume these aliases — never the deep paths.
- Phase 3 — `lib/api/errors.ts`: `ApiError` class + `parseApiError(response)` parser. Preserves the 70+ ProblemDetails codes from `MASTER_PLAN §2.6` opaquely (no TypeScript union, no message map — Phase 4 maps to i18n keys). Captures the `X-Request-ID` echo header for trace correlation. Resilient to malformed JSON, empty bodies, and non-ProblemDetails responses (falls back to `unknown_error` + HTTP status).
- Phase 3 — `lib/api/server.ts`: `createServerApiClient()` factory for RSC + route handlers + Server Actions. Reads `Accept-Language` from `next/headers`, stamps a `crypto.randomUUID()` `X-Request-ID`, throws `ApiError` on non-2xx so consumers get a single error path.
- Phase 3 — `lib/api/client.ts`: `createBrowserApiClient(opts?)` factory + default `apiClient` singleton. `credentials: "include"` so guest cart cookie + admin session cookie flow. Authorization Bearer attached when `useAuthStore.getState().accessToken` is set, EXCEPT on `/api/v1/auth/*` paths (pathname-based check, not substring). 401 → `refreshAccessToken()` → retry once or fall through to throwing `ApiError`. Factory accepts a custom `fetch` for tests.
- Phase 3 — `lib/auth/store.ts` (Zustand) and `lib/auth/refresh.ts` ship as Phase-5 stubs (accessToken: null; refresh returns null) with explicit `// TODO: Phase 5 — single-flight refresh against /api/auth/refresh-tokens` comments. The interceptor wiring is in place; Phase 5 swaps the function bodies, not the call sites.
- Phase 3 — `lib/env/server.ts` (with `import "server-only"`) and `lib/env/client.ts` parse `process.env` via Zod schemas at module load. Server schema: `API_URL`, `SENTRY_DSN`, `NODE_ENV`. Client schema: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_ENV`, `NEXT_PUBLIC_SENTRY_DSN`. Crashes on import if a required field is missing rather than failing silently downstream.
- Phase 3 — `app/api/diag/route.ts`: dev/staging-only diagnostic that calls the server fetcher's `GET /health` and returns `{ ok, backend, requestId }` on success or `{ ok: false, error }` with 502 on failure. Production builds 404 via `notFound()` env gate.
- Phase 3 — `tests/unit/api-errors.test.ts` (12 cases): every ProblemDetails variant, malformed JSON, empty body, 422 with `errors: [...]`, X-Request-ID capture, 5xx fallback, 0-status edge case, opaque code preservation.
- Phase 3 — `tests/component/api-client.test.ts` (7 cases): Authorization header attached/skipped per pathname, X-Request-ID UUID format, ApiError thrown on non-2xx, refresh-on-401 stub semantics (Phase 3 falls through; Phase 5 retries with the new token).
- Phase 3 — CI gate: new `types-check` job regenerates `generated/api.d.ts` from `openapi.json` snapshot and fails on `git diff --exit-code` drift.
- Phase 3 — `vitest.config.ts > test.env` injects `NEXT_PUBLIC_API_URL` + `API_URL` + `NODE_ENV` defaults so the Zod env schemas don't crash the test runner in CI (no `.env.local` available there).

### Changed

- Phase 3 — `lib/api/client.ts` exposes a `createBrowserApiClient(opts?)` factory in addition to the default `apiClient` singleton. The factory accepts a custom `fetch` for testability.
- Phase 3 — `package.json` adds `types:generate`, `types:generate:snapshot`, and `types:check` scripts.

### Notes

- **R-A from the Phase 3 plan was preempted.** openapi-typescript v7.13 emits `field?: T` (not `field?: T | undefined`) which is `exactOptionalPropertyTypes: true`-safe. No flags, no tsconfig relaxation needed. If a future openapi-typescript version regresses this, we have headroom to upgrade or add `--immutable`/`--default-non-nullable` flags before relaxing strict mode.
- **D7 (auth stubs ship now).** The Phase-5 TODO comments in `lib/auth/store.ts` and `lib/auth/refresh.ts` carry the full implementation contract: single-flight dedup of concurrent refresh attempts, route handler at `/api/auth/refresh-tokens`, redirect to `/auth/otp` on failure, never-loop-on-auth-endpoints rule.
- **Diagnostic route smoke (verified at phase close):** `curl localhost:3000/api/diag` returned `{"ok":true,"backend":{"status":"ok","version":"0.1.0"},"requestId":"49de0325-1a59-4697-a0c4-ec29cdb3413f"}` against the running backend. Backend version 0.1.0 is the FastAPI app's `version` field (not the git tag); wire is end-to-end verified.

## [0.2.0] - 2026-05-03

### Added

- Phase 2 — Brand foundation: `lib/brand.ts` is the single source of the literal "Nookat" string + tagline + supportPhone + licenseNumber + address. `BrandConfig` type exported. Code-side grep verified: zero matches outside `lib/brand.ts`.
- Phase 2 — Design tokens in `app/globals.css` via Tailwind 4 `@theme` block per `DESIGN_BLUEPRINT §4-§10`: brand 50-900 (medical blue), ink 50-950 (warm neutrals), surface (warm whites), success/warning/danger semantic, pharmacy-domain `stock-in/stock-out/rx-flag/cold-chain`, mobile-first type scale with desktop `@media (min-width: 1024px)` overrides, radius ladder (6/10/14/20/9999), elevation 1-4, easing (standard/emphasized/decelerate/accelerate). Motion durations live in `:root` and zero out under `@media (prefers-reduced-motion: reduce)`.
- Phase 2 — Fonts via `next/font/google` in `app/layout.tsx`: Inter (latin + cyrillic + cyrillic-ext) → `--font-inter`, JetBrains Mono (latin + cyrillic) → `--font-jetbrains-mono`, DM Serif Display (latin) → `--font-dm-serif`. All `display: swap`. `--font-sans` resolves to Inter.
- Phase 2 — 4 placeholder logo SVGs in `public/brand/`: `logo-horizontal.svg`, `logo-mark.svg` (24×24 favicon-friendly), `logo-mono.svg` (currentColor), `logo-on-dark.svg`. Tilted-pill mark + DM Serif wordmark. Real logo lands pre-launch (OQ-15 backlog).
- Phase 2 — shadcn/ui pinned to **Radix** (`--base radix --preset nova`); 18 primitives copy-installed under `components/ui/`: button, input, label, badge, card, dialog, sheet, dropdown-menu, tabs, sonner (toast), tooltip, avatar, skeleton, separator, select, checkbox, radio-group, switch. All using `radix-ui` (umbrella package); zero Base UI references. shadcn semantic vars (`--primary`, `--background`, `--muted-foreground`, etc.) are mapped to our brand tokens at the CSS layer (D4 hybrid; see `DECISION_LOG.md`).
- Phase 2 — Behaviour customizations: `Button` gained a `loading` prop (disables, sets `aria-busy`, renders `Loader2Icon` spinner; branched cleanly for asChild). `Badge` swapped its variant set to spec's `default | success | warning | danger | info`. `Card` gained a `raised` variant with `shadow-elev1`.
- Phase 2 — 5 pharmacy composed-component skeletons with typed props: `StockPip`, `PriceTag` (locale-aware, ru/ky use thin space + сом suffix; en uses comma thousands + KGS), `EmptyState`, `ErrorState`, `PhoneCallButton` (tap-to-call via `tel:` link to `BRAND.supportPhone`).
- Phase 2 — `app/(dev)/kitchen-sink/page.tsx` dev-only design-system showcase. Production-gated via `notFound()` on `NEXT_PUBLIC_ENV === "production"`. Renders all 18 primitives × variants + 5 composed components with real Bishkek-shaped data (Парацетамол 500мг 12 таб, Нурофен Экспресс, Витамин С, Аспирин Кардио at realistic KGS prices; address `мкр Асанбай 1/22`).
- Phase 2 — Component tests under `tests/component/`: `button.test.tsx` (variants, sizes, disabled, loading, click handling, focus ring), `input.test.tsx` (placeholder, Cyrillic input, label association, aria-invalid, disabled, type=tel). 23 tests total via Vitest + RTL.
- Phase 2 — `tests/e2e/kitchen-sink-visual.spec.ts` Playwright smoke: kitchen-sink renders at 3 breakpoints (375 / 768 / 1280) with all section headings + at least one Cyrillic medicine label visible. Visual-snapshot comparison deferred to Phase 11.

### Changed

- Phase 2 — `app/page.tsx` placeholder now reads `BRAND.name` (was brand-free in Phase 1). Body copy and version line preserved.
- Phase 2 — `app/layout.tsx` now wraps children in `<TooltipPrimitive.Provider>` so any descendant `<Tooltip>` works without a per-page provider.

### Removed

- Phase 2 — During the shadcn re-init from Base UI to Radix: `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css` were removed during rollback then re-installed via the Radix-pinned shadcn init. Net effect: same packages but on the Radix track.

### Notes

- The shadcn `--defaults` flag selected `base-nova` (Base UI) which contradicted `FRONTEND_BLUEPRINT §2.1` and `DESIGN_BLUEPRINT §11.1`. Rolled back, re-ran with `--base radix --preset nova`. Full episode logged in `DECISION_LOG.md` 2026-05-03 entry. Verified post-cleanup: `components.json` reads `"style": "radix-nova"`, all components import from `radix-ui`, zero `@base-ui/react` references.
- shadcn `init` injected Geist font + a single-scalar `--radius` ladder + oklch defaults for shadcn's semantic vars. All cleaned: Geist removed (Inter wins `--font-sans`), our `DESIGN §9.3` radius scale preserved (`6/10/14/20/9999`), shadcn vars now map to our brand tokens at the CSS layer.
- Two shadcn-generated components needed `exactOptionalPropertyTypes: true` patches to compile under our strict tsconfig: `sonner.tsx` (theme prop narrowing), `dropdown-menu.tsx` (conditional spread for `checked`). Expect 2-5 similar patches per shadcn upstream merge going forward.
- Verification greps at phase close:
  - Hex discipline (`grep -rEn '#[0-9a-fA-F]{3,8}' components/ app/ --include='*.tsx' --include='*.ts'`) returned 0 hits.
  - Brand discipline (`grep -rn 'Nookat' --include='*.tsx' --include='*.ts' --include='*.css' .` excluding `node_modules` + `.next`) matched only `lib/brand.ts:2,6,19`.

## [0.1.0] - 2026-05-03

### Added

- Phase 0 deliverables — `MASTER_PLAN.md` with full backend endpoint inventory (33 customer endpoints, ~50 admin endpoints across 10 domains), i18n key inventory, 15 resolved open questions, 11 risks. `OPEN_QUESTIONS.md` with all Phase-0 resolutions + new `OQ-16` for the backend cart-merge endpoint. `DECISION_LOG.md` with the cart-merge workaround entry + 13 architectural defaults. `BUILD_PROGRESS.md` with phase tracker, smoke recipes, and pre-launch backlog.
- Phase 1 — Next.js 16 (App Router) bootstrap at the repo root: TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); Tailwind 4 default install (brand tokens land in Phase 2); ESLint 9 flat config (`@typescript-eslint`, `react`, `react-hooks`, `jsx-a11y`, `@next/next` core-web-vitals); Prettier 3 with `prettier-plugin-tailwindcss`; Husky + lint-staged pre-commit hook.
- Phase 1 — Test scaffolding: Vitest with jsdom + RTL + jest-dom matchers, one sanity unit test; Playwright with three browser projects (chromium, firefox, webkit), one homepage E2E test.
- Phase 1 — `app/api/health/route.ts` returning `{ status: "ok", version }` (hardcoded `0.1.0` for Phase 1; wires to git SHA in Phase 12).
- Phase 1 — Sentry skeleton: `@sentry/nextjs` installed; `sentry.{client,server,edge}.config.ts` + `instrumentation.ts` are no-ops without DSN; full wiring in Phase 11.
- Phase 1 — Multistage `node:20-alpine` Dockerfile with `output: "standalone"`, non-root `nextjs` user, `wget`-based healthcheck on `/api/health`.
- Phase 1 — GitHub Actions CI: parallel `lint | typecheck | test | build` jobs on every PR; chromium-only E2E on PR; full matrix (chromium + firefox + webkit) on push to `main` and `staging`.
- Phase 1 — Persistent state files at root: `MASTER_PLAN.md`, `BUILD_PROGRESS.md`, `DECISION_LOG.md`, `OPEN_QUESTIONS.md`, `RISKS.md`, `CHANGELOG.md` (this file), `AGENTS.md` redirecting to `CLAUDE.md`.
- Phase 1 — `feat(rules): authorize auto-push at phase boundaries` codified `CLAUDE.md` Operating Principle #11 (auto-push on green verification gate; force-push and non-main branches still need approval).

### Changed

- Replaced the `create-next-app` placeholder homepage with a minimal foundation placeholder (no brand styling — Phase 2 introduces brand tokens and the real shell).
- Replaced the bootstrap-generated `CLAUDE.md` (pointer file) with the project's canonical rulebook copied from `/specs/`.
- Renamed `FRONTEND_CLAUDE.md` → `CLAUDE.md` so the project rulebook matches the standard convention.

### Notes

- Next.js 16.2.4 + React 19.2.4 + TypeScript 5.9 + Tailwind 4.2 chosen at install time (current latest at 2026-05-03). The `AGENTS.md` warning is preserved verbatim — Next 16 has real differences from prior major versions; Phase 2+ work that touches Next-specific APIs must consult `node_modules/next/dist/docs/`.
- Sentry's `@sentry/cli` postinstall script is intentionally not approved (dev-only, only needed at deploy for sourcemap upload). Phase 11 revisits.
- Git history rewritten with `git filter-branch` to pin all commits to `msayyid <201980620+msayyid@users.noreply.github.com>` (GitHub privacy email) and strip any AI-attribution trailers. The rule is now codified in `CLAUDE.md` Operating Principle #11.
