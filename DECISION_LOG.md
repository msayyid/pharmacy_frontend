# Decision Log

> Append-only record of non-obvious choices. Future-you should understand why something was done a particular way without re-deriving. Format per `FRONTEND_CLAUDE_CODE_PROMPTS.md §Templates`.

---

### 2026-05-03 — Cart-merge workaround: sequential re-add after OTP verify
**Phase:** 0 (resolution); 5 (implementation lands here)
**Context.** Backend's `POST /api/v1/auth/otp/verify` does not invoke `CartService.merge_guest_into_user`. The merge service exists at `app/domain/orders/cart_service.py:158` but no route triggers it. As written, a guest who builds a cart and hits the auth wall at place-order would lose the guest cart's contents — `get_cart_owner` returns `(user, None)` and ignores the `pharmacy_cart_session` cookie when a Bearer is present.
**Decision.** **Frontend workaround for MVP.** After successful OTP-verify, the FE reads the guest cart's items from the in-memory TanStack Query cache (populated by the pre-login `GET /cart`). After receiving the new auth tokens, the FE re-adds each item by POSTing to `/api/v1/cart/items` in sequence with `credentials: "include"` so the new auth applies. Failures (out of stock, max-per-order capped) surface inline per-line; partial success acceptable; never blocks login. Implementation lands in Phase 5 co-located with the OTP-verify success handler. Tracked as **OQ-16** for the proper backend fix (a transactional `POST /api/v1/cart/merge` endpoint).
**Alternatives considered.**
- **A. Escalate to backend, block Phase 5 on the fix.** Rejected: backend Q13/Q14/Q15 are higher-priority blockers; cart-merge is a nicer-to-have; FE can ship without it.
- **B. Use the merge service via a backend "internal" endpoint we ask them to expose unauthenticated.** Rejected: leaks an internal service.
- **C. Skip cart-merge entirely.** Rejected: breaks J-01 conversion path. Even imperfect re-add preserves customer intent.
**Rationale.** Best-effort recovery > silent data loss. Sequential re-add preserves the items the customer wanted (the high-signal data); price snapshots are recoverable since the new POSTs read live prices. Loses no money, breaks no invariants, and is a single TODO away from being deleted when the backend lands `POST /cart/merge`.
**Trade-offs.** (1) Loses the original `price_snapshot` per line — if a price changed between guest add-to-cart and post-login, the customer sees the new price (this is consistent with backend behaviour on revalidation anyway). (2) Sequential POSTs mean N round-trips on slow connections; capped by quantity-of-items, typically ≤5 in practice. (3) Race condition theoretically possible if user opens two tabs and verifies in both; mitigated by idempotency-on-add-to-cart at the cart-line level (backend deduplicates by `(cart_id, product_id)`).
**Reversibility.** **Easy.** Single-file delete + replace with `POST /cart/merge` call when the backend lands the endpoint. The TODO references OQ-16.
**References.** `OPEN_QUESTIONS.md OQ-16`; `MASTER_PLAN.md §6 Q-5` and §7 R-5; backend `app/domain/orders/cart_service.py:158`, `app/api/v1/auth.py` (no merge call).

---

### 2026-05-03 — Architectural defaults from FRONTEND_BLUEPRINT confirmed at Phase 0
**Phase:** 0
**Context.** The four spec files describe an architecture the project is committed to. Capturing here so future phases don't re-litigate.
**Decisions (all confirmed during Phase 0 reading; not open for re-debate without spec amendment).**

1. **Two repos, no monorepo.** `nookat-storefront` + `nookat-admin`; duplicate the few overlaps (design tokens, generated API types) for MVP. Promote to a published `@nookat/shared` package only if duplication starts to hurt (~Phase 1.5). _(FRONTEND §3.)_
2. **Coolify on the same VPS as backend** for both apps. Not Vercel — KG-edge latency on Vercel hurts the audience. _(FRONTEND §2.6.)_
3. **next-intl** for i18n, with `[locale]` URL segments and three locales `ru | ky | en`, default `ru`. _(FRONTEND §13.)_
4. **TanStack Query v5** for server state; **Zustand** narrowly scoped for client UI state (one store per concern). _(FRONTEND §10, §11.)_
5. **shadcn/ui** copy-paste owned components on Radix primitives. We own the components in `components/ui/`. _(FRONTEND §2.1.)_
6. **react-hook-form + Zod** for forms; Zod for runtime parsing at boundaries. _(FRONTEND §12.)_
7. **openapi-typescript + openapi-fetch** for typed API client. `generated/api.d.ts` is checked in; CI fails on drift via `pnpm types:check`. _(FRONTEND §6, §7.)_
8. **Tailwind 4** with brand tokens in CSS custom properties. No raw hex / raw font-size / raw spacing in components. _(DESIGN §4-10; FRONTEND §2.1.)_
9. **App Router with RSC default;** `"use client"` is justified per occurrence and gets a comment explaining why. _(FRONTEND §9.2.)_
10. **JWT bearer for customers; HttpOnly session cookie for admin.** Customer refresh token wrapped in HttpOnly cookie at the FE origin via Route Handler (per Q-4 decision below). _(FRONTEND §8.)_
11. **Strict TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. No `any`, no `@ts-ignore`. _(FRONTEND §21.1.)_
12. **Conventional Commits** with shared scope vocabulary (`auth`, `cart`, `checkout`, `catalog`, `pdp`, `admin`, `i18n`, `ci`, `deps`, `infra`). _(FRONTEND §21.6.)_
13. **Sentry** for errors + web vitals. **No analytics integration at MVP** (PRODUCT §10); event hooks ready for Phase 1.5. _(FRONTEND §2.5, §19.)_

**Reversibility.** Each is reversible but expensive past Phase 1; the plan-first gate on every phase is the place to flag any reversal request before implementation.
**References.** `MASTER_PLAN.md §8`.

---

### 2026-05-03 — Phase 2 Sub-phase 2C: rejected shadcn's Base UI default, pinned to Radix per spec
**Phase:** 2 (Sub-phase 2C)
**Context.** Running `pnpm dlx shadcn@latest init --defaults` selected the **`base-nova` preset, which uses `@base-ui/react` (Base UI) primitives, not Radix UI**. The first generated `components/ui/button.tsx` imported `from "@base-ui/react/button"`. This contradicts `FRONTEND_BLUEPRINT §2.1` and `DESIGN_BLUEPRINT §11.1`, both of which explicitly state shadcn should sit on Radix primitives. The spec asserts the Radix choice repeatedly: focus-trap mechanics, `<Dialog.Trigger>` / `<Tabs>` API shapes referenced in the prompts for Phases 5–10 are written assuming the Radix API surface.

**Decision.** Rolled back shadcn's first init (`git checkout -- app/globals.css app/layout.tsx`, `rm -rf components/ lib/utils.ts components.json`, `pnpm remove @base-ui/react class-variance-authority clsx tailwind-merge lucide-react tw-animate-css`), then re-ran `pnpm dlx shadcn@latest init --base radix --preset nova --yes`. Verified before bulk-add: `components.json` now reads `"style": "radix-nova"`, the umbrella package `radix-ui@^1.4.3` is installed, **zero references to `@base-ui/react` across `components/ui/*.tsx`**, and the regenerated `button.tsx` imports `Slot from "radix-ui"`.

**Alternatives considered.**
- **A. Roll back + re-init with `--base radix`.** Chosen. Stays on-spec; phases 5–10 prompts work as written; uses the proven primitive that's shipped on millions of sites since 2019.
- **B. Accept Base UI as a documented deviation.** Rejected: friction at every future phase boundary (Radix `<Dialog.Trigger>` API shapes in spec text would not directly translate to Base UI), and Base UI v1 is from 2024–25 — too young for a production pharmacy. The user's words: "Nookat is going to production with real customers; we use the proven primitive, not the theoretically-better-future one."
- **C. Bypass shadcn entirely; install Radix primitives directly + write our own thin wrappers.** Rejected: ~18 components of upfront cost, sidesteps shadcn's value (the styled wrappers, not the primitives).

**Rationale.** Spec compliance + production maturity + reversibility-is-cheap-later. If shadcn fully consolidates on Base UI in 2027 and Radix gets less love, we migrate as a focused sprint when Base UI is battle-tested. Don't pre-pay that cost now.

**Side findings during cleanup.**
1. **Geist font import injected into `app/layout.tsx`** (whichever preset). Removed; restored Inter as the sole `--font-sans` source. Geist must not appear anywhere in `app/layout.tsx`. The preset's `--updating fonts--` step is the source.
2. **shadcn re-defines `--radius-sm/md/lg/xl` via `@theme inline { calc(var(--radius) * 0.6) ... }`** based on a single `--radius` scalar. Removed that block; our `DESIGN §9.3` ladder (`--radius-sm: 6px`, `-md: 10px`, `-lg: 14px`, `-xl: 20px`, `-pill: 9999px`) is the source of truth.
3. **shadcn injects `:root { --background, --foreground, --primary, --card, ... }` (oklch defaults).** Replaced with hybrid mapping: those names point at our brand tokens (e.g., `--primary: var(--color-brand-500)`). See decision below for D4 mapping rationale.
4. **shadcn's `.dark` class removed** for MVP (no dark mode at launch per `DESIGN §4.8`). Reintroduce as a focused phase later with proper dark-tone brand tokens.
5. **`@import "tw-animate-css"` and `@import "shadcn/tailwind.css"` kept** — both load-bearing. `tw-animate-css` provides `animate-in/out` utilities used by Dialog/Sheet. `shadcn/tailwind.css` defines `@custom-variant data-open/data-closed/data-checked/data-active` and `@keyframes accordion-up/down` referenced by Radix-state-driven shadcn components.
6. **`exactOptionalPropertyTypes: true` flagged 2 shadcn components** (`sonner.tsx` `theme` prop, `dropdown-menu.tsx` `checked` prop). Patched both:
   - `sonner.tsx`: narrowed `useTheme()` raw value to `"light" | "dark" | "system"` instead of `as` cast through possibly-undefined.
   - `dropdown-menu.tsx`: conditional spread `{...(checked !== undefined && { checked })}` so `undefined` never reaches the Radix prop.
   This will recur on shadcn updates; expect 2-5 patches per shadcn upstream merge under our strict tsconfig.

**D4 (shadcn token mapping) — recap.** shadcn keeps its semantic var names (`--primary`, `--background`, `--muted-foreground`, etc.) in components/ui/*.tsx. Those names resolve to OUR brand tokens at the CSS layer in `app/globals.css :root {}` block. Components keep using `bg-primary` (semantic naming preserved), but `--primary: var(--color-brand-500)`. **Reading `bg-primary` in a component is intentional, not drift.** Lower friction on shadcn updates; spec's "use OUR tokens" principle is satisfied via mapping.

**Reversibility.** Hard. Once primitives are wired into Phases 5-10 against Radix API shapes, switching to Base UI would require touching most components. Plan to revisit only if the Radix umbrella package goes unmaintained.

**References.** `FRONTEND_BLUEPRINT §2.1`; `DESIGN_BLUEPRINT §11.1`; user message authorizing Path A on 2026-05-03; `BUILD_PROGRESS.md > Phase 2`.

---

### 2026-05-03 — Phase 3: API client + type generation
**Phase:** 3
**Context.** Stand up a typed, error-aware HTTP client wired to the backend's OpenAPI spec, with auth-aware variants for RSC and client. CI must fail on type drift. ApiError carries the 70+ ProblemDetails codes opaquely (no enumeration); Phase 4 maps them to i18n keys.

**Decisions.**

- **D1 — Code-gen tools.** `openapi-typescript@7.13` (types) + `openapi-fetch@0.17` (runtime). v7 of openapi-typescript proved exactOptionalPropertyTypes-clean on first generation — no patches needed. R-A from the plan was preempted.

- **D2/D3 — CI types-check via openapi.json snapshot.** Backend isn't reachable from GitHub Actions runners. Strategy: commit `openapi.json` at repo root + `generated/api.d.ts`. CI runs `pnpm types:generate:snapshot` (regenerates from the local snapshot, not a live URL) and `git diff --exit-code generated/api.d.ts`. Backend version bumps land via an explicit `feat(api): regenerate types from backend@<sha>` commit that updates BOTH files together. Rejected: spinning up a backend service container in CI (operational complexity for marginal benefit; deterministic snapshot is preferable).

- **D4 — No pre-commit types check.** `lint-staged` stays as-is (eslint --fix + prettier --write only). Regenerating types is too slow for pre-commit. CI catches drift before merge.

- **D5 — `ApiError` shape.** `class ApiError extends Error` with `code: string`, `status: number`, `context: Record<string, unknown>`, `requestId?: string`, `errors?: ProblemDetailsError[]`. Constructor takes a single options object so call sites name fields explicitly. **`code` stays a plain string — we do NOT enumerate the 70+ codes catalogued in MASTER_PLAN §2.6 as a TypeScript union.** Phase 4 maps `error.${code}` → translated strings via i18n; Phase 3's job is just opaque preservation.

- **D6 — Two fetcher factories on one error path.** `lib/api/server.ts` exports `createServerApiClient()` (RSC, `import "server-only"`, reads `Accept-Language` from `next/headers`); `lib/api/client.ts` exports `createBrowserApiClient(opts?)` factory + a default `apiClient` singleton. Both use the same `parseApiError`-throwing middleware. Server fetcher does not attach auth in Phase 3; client fetcher reads from `useAuthStore.getState().accessToken`.

- **D7 — Auth stubs ship in Phase 3.** `lib/auth/store.ts` (Zustand) and `lib/auth/refresh.ts` (returns `null`) ship now with explicit `// TODO: Phase 5 — single-flight refresh against /api/auth/refresh-tokens` comments. The 401 interceptor calls `refreshAccessToken()` and falls through to throwing `ApiError` when null. Phase 5 swaps the function bodies; call sites stay untouched.

- **D8 — Sentry breadcrumbs deferred to Phase 11.** The fetcher middleware shape is ready, but Sentry calls aren't added yet. Adding `Sentry.addBreadcrumb` calls now would be safe (no-op without DSN) but pollutes the file. Phase 11 hardening adds breadcrumbs alongside the real DSN wiring.

- **D9 — `crypto.randomUUID()` per-request `X-Request-ID`.** Stamped in both fetcher middlewares' `onRequest`. Backend's `RequestIdMiddleware` echoes it in the response headers; `parseApiError` captures the echo for trace correlation on failures. Verified end-to-end via the diagnostic route.

- **D10 — Auth-endpoint guard via pathname, not substring.** `new URL(request.url).pathname.startsWith("/api/v1/auth/")` instead of the spec's `request.url.includes("/auth/")`. The substring check would also match a hypothetical `/me/auth/*` and create false negatives. Pathname-based is unambiguous.

- **D11 — Two env modules with Zod.** `lib/env/server.ts` (with `import "server-only"`) parses `API_URL`, `SENTRY_DSN`, `NODE_ENV`. `lib/env/client.ts` parses `NEXT_PUBLIC_*`. Both throw on import if a required field is missing. Test runner gets defaults via `vitest.config.ts > test.env`.

- **D12 — Diagnostic route at `/api/diag` (no underscore).** Next.js App Router treats `app/_folder` as a private folder (not routed); using `_diag` would have made the route unreachable. Path is `app/api/diag/route.ts`. Production is gated via `notFound()` when `NEXT_PUBLIC_ENV === "production"` — same env-gate pattern as the kitchen sink.

- **D13 — No MSW.** Tests inject a custom `fetch` via openapi-fetch's `fetch` option (the new `BrowserApiClientOptions.fetch` field on `createBrowserApiClient`). Simpler than MSW for these middleware tests; one fewer dep to maintain.

- **D14 — Caching defaults only.** `createServerApiClient` does NOT set Next.js `revalidate` or `cache:` options. Per-surface caching (categories 5m, products 5m, search 30s, cart no-cache) is set at consumer call sites in Phases 6-10.

**Side findings.**
- Vitest doesn't load `.env.local` automatically. Without `vitest.config.ts > test.env` defaults, `lib/env/client.ts` Zod parse crashed all tests in this phase. The fix injects `NEXT_PUBLIC_*` + `API_URL` + `NODE_ENV` defaults at the runner level. CI inherits the same defaults; no `.env.local` needed in CI either.
- openapi-fetch's `fetch` option is typed `(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>`. Test mocks must widen their parameter types accordingly (using `_input: RequestInfo | URL` rather than `_request: Request`) to satisfy the typecheck.
- The `client.GET("/health" as never)` cast in the diagnostic route is needed because openapi-fetch's path inference treats `/health` as outside the `/api/v1` namespace; the cast bypasses the string-literal check. Acceptable for an env-gated dev route.

**Reversibility.** Easy. The fetcher factories are pure functions; the auth stubs are 5-line files. Replacing the snapshot strategy with a service container is a CI-only change.

**References.** `FRONTEND_BLUEPRINT §6, §7, §14, §15, §19`; `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 3`; backend `app/api/errors.py` for ProblemDetails contract; `app/main.py` for middleware order (RequestId outermost, echoes header); `app/core/config.py` for env names. Phase 3 plan in chat 2026-05-03.

---

### 2026-05-03 — Phase 4: i18n foundation
**Phase:** 4
**Context.** Wire `next-intl` for three-locale routing with the message file shape that mirrors the backend's `app/i18n/<lang>.json` exactly so backend ProblemDetails `code` values flow through `t(\`error.\${code}\`)` without translation drift. The user's load-bearing Phase 4 reminder: "the i18n discipline you set in Phase 4 protects the next 8 phases. If the message-key shape mismatches the backend's, every backend error code will fall through to `error.generic` and translation drift will compound."

**Decisions.**

- **D1 — Locale URL strategy: prefix-all.** `/ru/...`, `/ky/...`, `/en/...`; `/` redirects to a negotiated locale via `localeDetection: true`. SEO-explicit; aligns with backend's default-RU resolver.

- **D2 — Message-file shape: dotted-flat keys, mirror backend exactly.** `{"auth.otp.invalid": "..."}` (one-level dictionary with dotted key NAMES) — NOT nested objects (`{auth: {otp: {invalid: "..."}}}`). next-intl supports both; we use flat for backend parity. The user's quote: "If next-intl's preferred shape is nested objects, use the flat-key style anyway for backend parity." `t("auth.otp.invalid")` looks up the literal key string, not a path.

- **D3 — FE-mirrored keys vs FE-only keys.** Mirror backend's 43 non-sms keys (auth.*, cart.*, checkout.*, error.*, order.status.*, product.*, search.*) verbatim. FE adds `brand.{name,about,tagline}` + `ui.locale.*` namespaces. sms.* is server-only (PRODUCT §21.3); FE never resolves it.

- **D4 — Brand keys live in BOTH `lib/brand.ts` AND `messages/<lang>.json`.** lib/brand.ts is for non-translatable contexts (HTML title, OG meta, code-side `BRAND` const). Messages JSON is for `t("brand.name")` UI rendering. Per DESIGN §1.3, the wordmark is "Ноокат" in RU/KY and "Nookat" in EN — both file kinds reflect this (lib/brand.ts via `BRAND.nameLocalized`; messages via per-locale value).

- **D5 — Locale persistence.** `NEXT_LOCALE` cookie via next-intl middleware for guests; `User.preferred_language` for logged-in (Phase 5 wires user pref).

- **D6 — App router restructure.** Moved `<html>+<body>+next/font+NextIntlClientProvider` into `app/[locale]/layout.tsx`. **Deleted `app/layout.tsx` entirely.** Spec-aligned approach (R-A) compiled cleanly under Next 16 — no fallback needed. All rendered pages live under `[locale]`; route handlers (`/api/*`) stay layout-free.

- **D7 — next-intl@4.11.** Latest stable; spec patterns (`requestLocale`, `hasLocale`, `setRequestLocale`) work as written.

- **D8 — Locale-aware formatters.** `lib/format/{price,date,number,phone}.ts`. `formatPrice` swaps NBSP (Intl default) to thin space U+2009 for ru/ky per DESIGN §5.4 + §18.2. `formatDate` uses date-fns. `formatPhoneE164/Display` uses libphonenumber-js with `KG` default region matching backend's `phonenumbers`. PriceTag.tsx refactored to consume `formatPrice` (Phase 2's inline formatter retired).

- **D9 — `pnpm i18n:check`.** `scripts/i18n-check.mjs` (plain ESM JS, no TS toolchain). Loads three JSONs, checks key parity, exits non-zero on drift. CI runs it as a job.

- **D10 — LangSwitcher.** Compact pill switcher in Phase 4 (`components/i18n/LangSwitcher.tsx`); verbose footer version (full names «Русский» / «Кыргызча» / «English») lands in Phase 6 with the Footer component. Path swap via regex (`pathname.replace(/^\/[a-z]{2}/, ...)`) so path is preserved across locale changes.

- **D11 — date-fns has no `ky` locale.** Aliased KY to date-fns's RU locale; `DD.MM.YYYY` is identical between RU and KY per DESIGN §18.2 — zero visible difference. Documented in `lib/format/date.ts`.

- **D12 — KY/EN seed quality.** Backend-mirrored keys are human-curated (PRODUCT §21.2). FE-only `ui.*` + `brand.*` keys for KY/EN are seeded; flagged for the existing pre-launch backlog item per Q-9.

- **D13 — E2E updates.** Homepage spec is locale-agnostic on the `/` redirect (browser Accept-Language varies). New tests assert `<html lang="ky">` / `lang="en"` on direct entries and that the cookie pins subsequent `/` to the most-recently-visited locale. Kitchen-sink spec updated to `/ru/kitchen-sink`.

- **D14 — Brand-grep gate updated.** `messages/<lang>.json` legitimately contains "Nookat" / "Ноокат" under `brand.name` and `brand.about`. The TS/TSX brand grep still must match only `lib/brand.ts`; the messages-JSON matches are expected and not flagged.

**Side findings.**
- Next 16 prints `The "middleware" file convention is deprecated. Please use "proxy" instead.` next-intl 4.11 still ships `next-intl/middleware` (no proxy export); we keep `middleware.ts` until next-intl publishes a migration path. Logged as `RISKS.md R-13`.
- ESLint's `**/*.{ts,tsx}` rule didn't apply to `scripts/i18n-check.mjs`, so `console` and `process` raised `no-undef`. Added a `scripts/**/*.{js,mjs,cjs}` block with Node globals; React/jsx-a11y rules don't apply there.
- Playwright's chromium default Accept-Language is en-US. The first homepage E2E I wrote pinned `/` → `/ru`; reality is `/` → `/en` because of locale negotiation. The corrected test asserts the URL matches `/(ru|ky|en)/?$` and tests pin-to-/ru via direct navigation + cookie persistence.

**Reversibility.** Easy. Backend dotted-flat parity means a future migration to nested-object shape (if next-intl ever requires it) is a one-shot transform script.

**References.** `DESIGN_BLUEPRINT §17, §18`; `FRONTEND_BLUEPRINT §13`; `PRODUCT_BLUEPRINT §16, §21`; `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 4`; backend `app/i18n/{ru,ky,en}.json` and `app/core/i18n.py`. Phase 4 plan in chat 2026-05-03.

---

### 2026-05-03 — Phase 5: Auth & Account
**Phase:** 5
**Context.** Phase 5 is the largest feature phase yet — it stitches the OTP request/verify flow, the refresh-cookie route handlers, the single-flight refresh, the phone+OTP inputs, the OTP page state machine, the cart-merge workaround, the `/me` + `/me/addresses` CRUD, and the middleware composition with the existing next-intl middleware. Plan was approved with R-A, R-F, and R-E surfaced for special attention.

**Decisions.**

- **D1 — Tokens at our origin, refresh in HttpOnly cookie.** Backend returns `{access_token, refresh_token, expires_in}` from `POST /api/v1/auth/otp/verify`; FE never stores the refresh token in JS. The OTP page POSTs the pair to `/api/auth/set-tokens` (a Next route handler at our origin), which sets the `nookat_refresh` HttpOnly + Secure-in-prod + SameSite=Lax cookie (30-day max-age). The access token lives only in `useAuthStore` memory.

- **D2 — Single-flight refresh in `lib/auth/refresh.ts`.** A module-level `inFlight: Promise<string | null> | null` dedupes concurrent 401s app-wide. On success → `setTokens(access, expiresIn)` and return the token; on failure → `clear()` and return null. The `inFlight` is reset in `finally`. `_resetInFlightForTesting` exported under a leading-underscore name to make test isolation explicit.

- **D3 — Skip the "auth-hint" cookie.** No second cookie just to signal "I might be logged in." The HttpOnly refresh cookie itself is the only auth artifact at the edge. The middleware reads its presence to gate routes. RSCs that need auth state read it the same way (`cookies().has("nookat_refresh")`); pages that show different content for logged-in vs guest (e.g. account links in the header) hydrate from `useAuthStore` after first paint, accepting the brief flash. Confirmed by user.

- **D4 — Hard gate in middleware.** Routes matching `/[locale]/{account,orders,me}/*` redirect to `/[locale]/auth/otp?return=<sanitized current path>` when `nookat_refresh` is absent. The middleware composes two functions in sequence: `intlMiddleware(req)` first (sets the `[locale]` URL segment + locale cookie), then the auth gate as a sync wrapper around the next-intl response. Sync because next-intl 4.11's `createMiddleware` returns `(req: NextRequest) => NextResponse` synchronously.

- **D5 — Soft gate via Zustand for header chrome.** Components that need to show "Hi, Иван" vs "Войти" link read from `useAuthStore.currentUser`. Hydration races cause a brief guest-state flash on first paint; acceptable per DESIGN §13.5.

- **D6 — `app/api/auth/{set-tokens,refresh-tokens,logout}` only.** No `/api/auth/me` proxy — `useQuery({ queryKey: ["me"], queryFn: () => apiClient.GET("/api/v1/me") })` on the account page reads the live backend through the typed client. The route handlers exist solely to manage the HttpOnly cookie (which JS can't touch) and to add the bearer to the refresh request.

- **D7 — Phone input with libphonenumber-js (KG default).** `components/auth/PhoneInput.tsx` is RHF-friendly (forwardRef + controlled). Format-on-blur via `formatPhoneDisplay` from `lib/format/phone.ts`. `type=tel` + `inputMode=tel` + `autoComplete=tel`. Accepts `+996…`, `0…`, and bare digits per backend's parser.

- **D8 — OTP input as 6 single-digit cells.** `components/auth/OtpInput.tsx`. Auto-advance on digit; backspace-on-empty jumps to previous; ArrowLeft/Right move focus; paste fills all six cells (extracts first 6 digits from any pasted content); `onComplete` fires once when the value crosses 6 digits and re-fires after the value drops below 6 then refills (so resend → re-verify works without a remount).

- **D9 — OTP page as 2-state Client Component.** `app/[locale]/auth/otp/page.tsx`: `phase: "PHONE" | "CODE"`. Phone form → `POST /api/v1/auth/otp/request` → moves to CODE phase + starts a 60s resend cooldown. Code form → `POST /api/v1/auth/otp/verify` → on success POSTs tokens to `/api/auth/set-tokens`, fires `mergeGuestCartIntoUser({ guestItems: [], client })` (Phase 5D's empty-list call; Phase 8 plumbs the real guest cart), then `router.replace(sanitizedReturn)`.

- **D10 — Providers wrapper (`app/providers.tsx`) wraps everything in `[locale]/layout.tsx`.** Single source of QueryClient + NextIntlClientProvider + TooltipPrimitive.Provider. Stable QueryClient identity via `useState` factory. Locale changes recreate the [locale] subtree (rare, cheap), recreating the QueryClient — acceptable cost vs lifting QueryClient above [locale] which would resurrect the `app/layout.tsx` we deliberately removed in Phase 4 D6.

- **D11 — `/me` + `/me/addresses` as Client Components.** Avoids the awkward "RSC fetches with Authorization header" pattern (would require reading the cookie + calling backend `/auth/refresh` server-side just to render a profile page). Hard-gated by middleware so the page never renders for unauthenticated users. Both pages are `useQuery({queryKey: [...]})` with TanStack Query handling refresh-on-401 via the client fetcher's interceptor.

- **D12 — Address form as Sheet on mobile + dialog on desktop.** Sheet works at all sizes per DESIGN §11.3; we just use Sheet everywhere for simplicity. Delete-confirm via Dialog (sacred invariant — no `confirm()` / `alert()`).

- **D13 — Cart-merge wired now even though Phase 8 owns the cart.** `lib/cart/merge.ts` exists in Phase 5; the OTP-verify success handler calls `mergeGuestCartIntoUser({ guestItems: [], client })` with an empty list. When Phase 8 lands a real `useCart` hook, the call site swaps to read the guest items from there. Tests cover the per-item failure modes already.

- **D14 — Open-redirect-hardened return-URL sanitizer (R-F).** `lib/auth/return-url.ts` rejects: empty/missing, non-string, backslash-containing, protocol-relative `//evil.com`, scheme-relative `https://evil.com`, `javascript:` / `data:`, and any URL whose `parsed.origin !== request.origin`. Falls back to `/[locale]/account`. Test vectors enumerated in `tests/unit/return-url.test.ts`.

- **D-bug — i18n flat-key bug surfaced and fixed in 5F.** Phase 4 D2 picked dotted-flat JSON keys (`{"auth.otp.title": "..."}`) for backend parity. next-intl 4.x treats `.` in `t(key)` as a path separator and navigates `messages.auth.otp.title`, NOT `messages["auth.otp.title"]`. The homepage tests didn't exercise `t()` with dotted keys, so Phase 4 CI was a false-green for the i18n pipeline; the OTP page was the first place this surfaced, via Playwright web-server logs (`MISSING_MESSAGE: Could not resolve auth.otp.title in messages`). Fix: `i18n/unflatten.ts` converts the on-disk flat JSON to a nested object once per request inside `getRequestConfig`. The on-disk JSON shape stays flat (preserves backend parity); next-intl sees the shape it expects. Also set `timeZone: "Asia/Bishkek"` to silence the `ENVIRONMENT_FALLBACK` markup-mismatch warning.

**Side findings.**

- **R-A preempted (third time in a row).** next-intl 4.11 `createMiddleware` returns a synchronous `(req: NextRequest) => NextResponse`. Composing the auth gate as a sync wrapper around the next-intl response works cleanly — no Promise.then chain, no async coordination needed.

- **R-E (refresh cookie rotation race in multi-tab) — accepted, deferred to Phase 11.** The backend's refresh endpoint rotates the refresh token: each `POST /auth/refresh` invalidates the cookie's old value and returns a new one. If Tab A and Tab B both 401 simultaneously, the slower tab's refresh attempt fails (the rotated token was already consumed by the faster tab's refresh) and that tab silently logs out. Mitigation deferred to Phase 11: BroadcastChannel for cross-tab coordination + a localStorage "refresh-in-progress" lock. Single-tab is the supported MVP scenario. **Documented here so a future "I opened two tabs and got logged out" report doesn't read as a regression** — it's expected behavior under MVP scope.

- **`use client` files referencing `t()` rely on flat→nested unflatten.** Once the unflatten ran during the request, both server and client components see the same nested message tree (next-intl's NextIntlClientProvider receives the unflattened object via getMessages). No per-component changes were needed; the fix lands entirely in `i18n/request.ts`.

- **The `account/profile-form.tsx` "Saved." vs "Сохранено." check** uses `t("auth.otp.sent").includes("Код")` to detect locale (RU vs EN) for a status string. Brittle but works under the unflatten fix because the resolved string is the localized one. A proper locale-aware status string lands when we add `account.profile.saved` keys post-MVP — flagged in the pre-launch backlog implicitly under "EN translations human-reviewed."

- **vi.fn typing under exactOptionalPropertyTypes.** Test-side mocks for `(input, init?)` need explicit parameter types (`_input: RequestInfo | URL, _init?: RequestInit`) to satisfy `vi.fn`'s argtype inference; otherwise `mock.calls[0]` widens to `[]` and indexing fails typecheck. Documented now so future test files don't re-discover.

**Reversibility.** Most decisions are easy: the route handlers, refresh flow, providers, and inputs are all swap-in-place. The middleware composition is moderate (touches the entry point of every request). The unflatten fix is trivially reversible if next-intl ever ships flat-key support — delete `i18n/unflatten.ts`, drop the conversion call in `i18n/request.ts`. The cart-merge workaround is the marquee item to delete when the backend lands `POST /api/v1/cart/merge` (OQ-16).

**References.** `FRONTEND_BLUEPRINT §8 (auth & sessions)`, `§9.1 (routing)`, `§12 (forms)`; `DESIGN_BLUEPRINT §13.3 (phone input)`, `§13.5 (OTP input)`, `§12.10 (account pages)`; `PRODUCT_BLUEPRINT §8.1 / §8.3` (auth + addresses); `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 5`; backend `app/api/v1/auth.py`, `app/api/v1/account.py`, `app/domain/identity/*`, `app/core/security.py`. Phase 5 plan in chat 2026-05-03.

---

### 2026-05-04 — Phase 6: Catalog Browse (read-only)
**Phase:** 6
**Context.** Phase 6 stitches the storefront chrome (Header / Footer / MobileMenu) with the homepage RSC + categories index + category detail (grid folded in per Q2) + symptoms index + symptom landing + about page + cart placeholder. All read-only; no add-to-cart action wired (Phase 8 owns the cart). 41 new i18n keys; URL-driven Pagination + SortSelect; ProductCard skeleton-to-shipped; ProductImage wrapper centralizes the brand-pill fallback; locale-plumbing fix lands in `lib/api/server.ts`.

**Decisions.**

- **D1 — Hero CTA → `/[locale]/categories`** (not `/search`). Working CTA at phase close > aspirational broken CTA. Phase 7 retargets when the search route renders properly. Confirmed by user.

- **D2 — Grid breakpoints.** Product grid 4-up desktop / 2/3-up tablet / 1-up phone (matches DESIGN §12.4); symptom tile grid 2/3/4-up; category card grid 1/2/3-up on the homepage's featured strip. ProductImage forces a 1:1 square aspect ratio so the grid stays even regardless of source image dimensions.

- **D3 — Page-numbered pagination, 24/page, URL-driven.** State lives in `?page=N`; Pagination renders <Link> hrefs that preserve `?sort` (the parent's `buildHref(page)` callback). 7-button window with first/last + ±2 neighbours + ellipsis when there's a gap. Returns null when totalPages ≤ 1 — no chrome on a one-page list. Confirmed by user.

- **D4 — Sort-only filter rail at MVP.** Filter sheet/drawer is Phase 11 hardening per the prompt's out-of-scope list. SortSelect (Radix shadcn Select, client) writes `?sort=<value>`; resets `?page` to 1 on sort change to avoid mid-list surprises; default value `relevance` drops the query param for canonical URLs. Four options (`relevance | price_asc | price_desc | name_asc`) match the backend's accepted set.

- **D5 — Disabled "Add to cart" CTA, no tooltip.** Confirmed by user. Disabled state alone is universal e-commerce language; "Скоро" tooltip would create expectation drift and an i18n key we'd remove next phase. The CTA stays enabled-styled when in-stock (Phase 8 wires the click handler) and swaps to a localized OOS label ("Нет в наличии") with disabled styling when out-of-stock — both states are rendered as `<button disabled>`.

- **D6 — `in_stock_only=true` matches backend default.** All 5 seeded products are currently `is_in_stock=false` (inventory levels not populated until admin Phase A1+), so every category list-page legitimately renders the EmptyState. This is the "empty-state path verified for real" outcome the user accepted in Q5; populated-data verification re-runs at Phase 8 close.

- **D7 — Brand-pill fallback for product images, distinct from category/symptom icon fallback.** ProductImage uses `PillIcon` over a brand-50 wash for null `thumbnail_url`. CategoryCard uses `FolderIcon`; SymptomTile uses `ActivityIcon`. Three different fallback shapes for three different surfaces, each visually distinct so a missing-image surface doesn't read as "everything is missing the same way."

- **D8 — Header chrome at Phase 6.** Cart icon renders as 0-state (no badge); Phase 8 wires the live count. Account icon is auth-aware via `next/headers cookies()` server-side — logged-in users get `/account`, guests get `/auth/otp?return=…`. No client hydration. Search icon (mobile) + search input stub (desktop) link to `/[locale]/search` placeholder until Phase 7 fills it.

- **D9 — Per-surface `next.revalidate` windows in `lib/api/catalog.ts`** matching FRONTEND §15.2: categories tree 5m, category detail 1m, category products 30s, symptoms 5m, symptom products 30s, branches 1h. RSC pages call these helpers; per-page Next data cache holds responses for the configured window.

- **D10 — Server-side fetcher reads Accept-Language from URL, not browser header.** Surfaced during 6B smoke when `/ky/...` returned Russian content. Root cause: `createServerApiClient` was forwarding the inbound browser `Accept-Language` (often empty in curl, `en-US` in default Playwright), but the backend's locale resolver reads only Accept-Language. URL-segment locale is the source of truth; we override the header explicitly on every catalog call. Implementation: `createServerApiClient(locale?: string)` accepts an optional locale; `lib/api/catalog.ts` threads it through. (D11 is the same idea worded as a fix — keeping both for traceability.)

- **D11 — Catalog fetchers take `locale` as the first argument.** Every helper signature in `lib/api/catalog.ts` puts `locale` first so call sites read consistently. Pages pass it from the dynamic `[locale]` route segment. The fetcher constructs a per-call `createServerApiClient(locale)` so cross-request bleed isn't possible.

- **D12 — i18n keys: 41 new across 8 families.** `nav.* / home.* / category.* / symptom.* / branch.* / footer.* / pagination.* / product.add_to_cart`. Total now 101 × 3 locales. KY translations curated for the new families; EN seeded with English copy. Pre-launch backlog item for KY pharmacist review still applies (Q-9).

- **D13 — Branches/About at `/[locale]/about` (not `/[locale]/branches`).** Matches the prompt §6.4.6 + footer column 2 link target. Renders both seeded branches even though Q-1 says single-branch UX — operator sees "we have an Asanbay branch and a Central branch in Bishkek" which is correct given the seed, even if the brand identity is "Nookat in Nookat" geographically.

- **D14 — Symptom landing breadcrumb is inline, not via `Breadcrumb` component.** The CategoryDetail breadcrumb shape (`{id, slug, name}[]`) doesn't match the symptom flow's parents (Home → Symptoms → <name>). A 30-line inline breadcrumb is cheaper than generalizing the Breadcrumb component prematurely. If a third breadcrumb-shaped flow appears (e.g., orders → order detail), revisit.

- **D15 — Symptom name resolution via list-then-find.** Backend has no `GET /api/v1/symptoms/{slug}` detail route (OQ-18). The symptom landing page fetches the full symptoms list (cheap, cached 5m) and looks the slug up in JS. notFound() when slug doesn't match. When backend exposes a detail route, swap to a single GET.

**Side findings.**

- **R-A held (fourth time).** Header rendering fully-server with only the MobileMenu sheet trigger as a client island worked cleanly; build-exit-code is sufficient verification because the Header uses server-only APIs (`cookies()`, `getTranslations()`) that would fail compilation in a client component.
- **R-D was a frontend bug, not backend.** The user's Phase 6 plan flagged R-D as "if KY page returns Russian, that's a real backend bug — escalate." The bug turned out to live in `lib/api/server.ts` (wrong Accept-Language source). Backend correctly serves `?lang=ky` / `Accept-Language: ky`. Logged here so a future "backend doesn't honor Accept-Language" report doesn't get framed as a backend issue without first checking the FE plumbing.
- **OQ-22 self-resolved.** During the early 6B smoke `GET /api/v1/categories` returned `[]` despite 6 active rows. After a fresh dev-server start the endpoint began returning the 6 root categories with full Cyrillic. No backend fix applied. Most likely a `cache_get_or_set` race that cached an empty-array value during the seed window. Logged as a recommended audit before launch.
- **Test infrastructure: server-component testing via `getTranslations` mock.** RSC components that call `await getTranslations()` from `next-intl/server` cannot be tested directly in jsdom — the function refuses to run outside RSC context. Workaround: `vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockImplementation(async () => (key) => dict[key] ?? key) }))` then `await import` the component. This pattern is reused across `product-card.test.tsx` and `pagination.test.tsx` and is the recommended approach for any future RSC component test.
- **Empty-state correctness covered better than populated-state correctness.** Because all seeded products are out-of-stock (inventory levels not populated until admin Phase A1+), Phase 6 verified the empty-state code path more thoroughly than the populated path. ProductCard's in-stock variant is unit-tested but not e2e-rendered against real data. Re-verification re-runs at Phase 8 close when admin can seed inventory.

**Reversibility.** All decisions are component-local and easily revisited. The biggest "chunk" is the locale plumbing in `lib/api/server.ts` + `lib/api/catalog.ts` — if next-intl or the backend ever standardize on a different locale-resolution channel, the change is centralized in those two files.

**References.** `DESIGN_BLUEPRINT §11.3 / §12.1-§12.5 / §8.4`; `FRONTEND_BLUEPRINT §6 / §15.2 / §22`; `PRODUCT_BLUEPRINT §5 / §7.1 / §8.2 / §12 (Search & Discovery — note: spec calls this §12, not §17 as the original prompt cited)`; `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 6`; backend `app/api/v1/{categories,symptoms,branches}.py`, `app/domain/catalog/storefront.py`, `app/domain/catalog/storefront_schemas.py`. Phase 6 plan in chat 2026-05-04.

---

### 2026-05-04 — Phase 7 deps: embla-carousel-react + shadcn Accordion
**Phase:** 7 (sub-phase 7B)
**Context.** Phase 7's PDP needs an `ImageCarousel` (DESIGN §12.6 + §8.3 — square crop, touch-swipe on mobile, prev/next on desktop, thumbnail strip, LCP-aware `priority` on the first image) and a `ProductDescriptionTabs` component that switches between Tabs (desktop) and Accordion (mobile) per Phase 7 plan D2. Phase 2 installed shadcn Tabs but not Accordion; Phase 7 adds Accordion + a carousel primitive.

**Decisions.**
- **Embla Carousel** (`embla-carousel-react@^8.6.0`, ~5KB gz). Picked because hand-rolling carousel touch + keyboard a11y + reduced-motion is 50+ LOC of subtle bugs (the user's framing — "you'll be debugging at 11pm before launch"). Embla is the de-facto choice for shadcn Carousel and integrates with Radix focus management. Confirmed by user.
- **Shadcn Accordion** added via `pnpm dlx shadcn@latest add accordion -y -o` — single component, thin Radix wrapper, no extra dep beyond Radix Accordion (already pulled in by other shadcn primitives). Output: `components/ui/accordion.tsx`. No customization needed at install time.
- **No shadcn Carousel wrapper.** shadcn ships a `<Carousel>` wrapper around Embla (`components/ui/carousel.tsx`); we deliberately skip it. Reasons: (a) the wrapper's API is generic and our `ImageCarousel` is product-specific (knows about `StorefrontImage[]` shape, primary/thumbnails, `priority` on first), (b) installing it would prompt-overwrite our Phase 2 customized button.tsx, and (c) the wrapper's value-add is a lightweight prev/next button styling we already get from our Button + lucide chevron pattern. Building `ImageCarousel` directly on Embla's `useEmblaCarousel` hook is ~80 LOC and skips one indirection.

**Reversibility.**
- **Embla escape hatch.** If Embla becomes a maintenance burden (regressions on new Next/React, abandoned upstream, perf regression on mid-range Android), swap to vanilla touch + CSS `scroll-snap-type` + an IntersectionObserver-based active-indicator in Phase 11 hardening. Estimated swap cost: 1 day. The `ImageCarousel` component's external API (props: `images: StorefrontImage[]`, `priority`) doesn't expose Embla types, so swap doesn't ripple to consumers.
- **Accordion escape hatch.** Accordion is just a Radix wrapper; if shadcn's styling drifts in a future major, we own `components/ui/accordion.tsx` outright (shadcn's "copy-paste owned" model from Phase 2 D4).

**Cost.** package.json + lockfile churn; ~5KB gz on PDP route. Within the 17.1 perf budget.

**References.** `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 7.4.2`; user message authorizing Embla 2026-05-04 (Q4 of Phase 7 plan response); CLAUDE.md hard prohibition #14 (new top-level dep gets a DECISION_LOG entry).

---

### 2026-05-04 — Phase 7: PDP & Search
**Phase:** 7
**Context.** Phase 7 ships the PDP at `/[locale]/products/[slug]` and the search route at `/[locale]/search`, including the header SearchInput + SearchSuggest dropdown that types ahead of the URL state. Closes the J-01 browse half end-to-end up to "click Add to cart" (Phase 8 picks up at the cart action).

**Decisions.**

- **D1 — Hero CTA retargeted to /search.** Phase 6 plan Q1 deferred this; Phase 7 7C lands the change. One-line. The search route comes online in 7D, so there's no broken-link window: the link resolves to a working route by phase close. Confirmed by user.
- **D2 — PDP layout: tabs on desktop, accordion on mobile.** Both rendered side-by-side via Tailwind responsive class swapping (`md:hidden` / `hidden md:block`). Accordion mounts with `defaultValue={sections.map(...)}` so all panels expand by default per PRODUCT §F-CAT-003. Tabs mount with `defaultValue={firstId}` showing only the first panel until the user picks a tab.
- **D3 — Description sections omit empty fields.** PDP page filters `SECTION_KEYS.flatMap(...)` against `product[entry.field]` truthiness. Null fields don't produce empty tabs. PRODUCT spec doesn't mandate generic "Not specified" copy; cleaner to gracefully omit.
- **D4 — ImageCarousel via Embla, no shadcn Carousel wrapper.** Two Embla instances (main + thumbs) per the standard pattern; main echoes its `selectedScrollSnap()` to the thumb strip. LCP optimization: first image renders with `priority={true}`. Empty state delegates to `<ProductImage src={null}>` (brand-pill); single-image state renders without controls. shadcn Carousel skipped (would prompt-overwrite Phase 2's customized button.tsx; our component is product-shape-specific anyway).
- **D5 — SubstitutesBlock with three exports.** `SubstitutesBlock` (RSC, takes pre-fetched `ProductCard[]`), `SubstitutesAsync` (async wrapper for the Suspense path), `SubstitutesSkeleton`. PDP picks the consumption mode based on stock: in-stock wraps `<SubstitutesAsync>` in `<Suspense>` below the description tabs; OOS folds the related fetch into the main render path and renders `<SubstitutesBlock>` directly above the fold (after the disabled CTA section).
- **D6 — OOS PDP promotes substitutes above-fold.** PRODUCT §F-CAT-007 + user's Q3 confirmation. Customer with active intent sees "here's what works the same" before scrolling past. Layout-shift avoided by skipping Suspense on OOS path (R-F mitigation).
- **D7 — Catch-and-empty pattern extends to PDP + search fetchers.** All four new helpers in `lib/api/catalog.ts` (`getProductDetail`, `getRelatedProducts`, `getSearchResults`, `getSuggestResults`) wrap try/catch and return empty defaults per CLAUDE.md OP-13. Phase 8 cart mutations MUST NOT copy this — explicitly flagged in the OP-13 amendment + Phase 8 plan-prep notes.
- **D8 — No SortSelect on /search.** Backend's composite ranking is the source of truth (exact name 1000 → name prefix 500 → FULLTEXT × 10 → ingredient 50 → symptom 30 → manufacturer 20). FE doesn't expose a sort selector; user controls relevance order by query term, not by sort dropdown. SortSelect stays only on category/symptom landings.
- **D9 — Autocomplete shipped in Phase 7 despite spec's P1 tag.** PRODUCT §F-CAT-005 marks autocomplete P1-deferred, but the backend `/search/suggest` endpoint is live + fully typed in our generated client. Cost of shipping (~150 LOC, ~5KB gz) is less than cost of half-baked search at MVP launch. Customers expect autocomplete on a pharmacy site (apteka.ru, eapteka.ru, planetazdorovo.ru all have it). Confirmed by user: "Spec's P1 tag was written before backend exposed /search/suggest; now it's typed and live."
- **D10 — Header SearchInput on desktop, icon-link on mobile.** Mobile full-screen overlay is Phase 11+ enhancement. Desktop swaps the Phase 6 stub Link for a live SearchInput component; Header itself stays an RSC.
- **D11 — Per-route caching.** PDP detail `revalidate: 60` (1 min, matches backend's 5-min cache; FE shorter for fast price/stock propagation). Related products `revalidate: 60` (same data freshness). Search results `cache: "no-store"` (URL-driven, per-query). Search suggest `revalidate: 30` (60s backend cache + 30s FE cache; suggest is hot enough that 30s feels right).
- **D12 — generateMetadata on PDP via lib/seo/title.ts.** `buildPageTitle({ prefix, brand })` builds the canonical `<page> | Nookat` pattern. Brand literal lives only in `lib/brand.ts` (CLAUDE.md brand discipline). Localized brand override per locale (Cyrillic "Ноокат" for ru/ky, latin "Nookat" for en).
- **D13 — DeliveryBadge static at MVP.** `StorefrontProductDetail` has no `delivery_estimate` field. Per-zone computation lands when admin Phase A1+ wires the data. Until then, the badge renders "Доставка сегодня в Бишкеке" by locale — honest at MVP (single-branch, single delivery zone).
- **D14 — ActiveIngredientChip uses search FULLTEXT fallback.** Each chip routes to `/[locale]/search?q=<inn_name>` rather than waiting for §F-CAT-006 filter-by-ingredient API. Backend's ranking weights ingredient matches at tier 50 (above manufacturer's 20), so first results for "paracetamol" will be paracetamol-containing products. Source comment in `ActiveIngredientChip.tsx` flags the upgrade path: when §F-CAT-006 ships, audit this code path. **Confirmed by user as a known fallback** with explicit "audit at upgrade" expectation.
- **D15 — i18n grows to 123 × 3.** 22 new keys across product.* and search.* families. KY/EN seeded; pre-launch human review still applies (Q-9).
- **D-screenshot — OOS PDP screenshot captured.** Per user directive, `test-results/phase-7-oos-pdp.png` (gitignored) is the visual moment of this phase since all 5 seeded products are out-of-stock. Confirms the OOS-promoted-substitutes layout and the empty-state-correctness verification re-runs at Phase 8 close once admin can seed inventory.

**Side findings.**

- **R-E gate held end-to-end.** New regression suite at `tests/e2e/r-e-gate.spec.ts` (3 specs) verifies the suggest XHR carries the URL-locale Accept-Language across all three locales. Permanent regression coverage; if this ever fails, audit `createBrowserApiClient` + `getApiClientForLocale` per OP-12.
- **R-A held (fifth phase in a row).** Embla's hooks-based API integrates cleanly with React 19 server components / client islands; the only friction was an eslint react-hooks setState-in-effect warning that resolved by moving the initial state read into `queueMicrotask` (so the effect body isn't synchronously dispatching a setState).
- **Embla incompatible with jsdom.** Multi-image carousel test skipped (`it.skip`) — Embla calls `matchMedia(...).addEventListener` and ResizeObserver-shaped APIs jsdom doesn't fully provide. Empty + single-image branches test fine; multi-image carousel covered by E2E (`tests/e2e/pdp-flow.spec.ts`) where real Chromium runs the code.
- **Server-component testing pattern carries over.** `vi.mock("next-intl/server", () => ({ getTranslations: ... }))` + `await import` of the component under test, established in Phase 6 6F, reused for `tests/component/search-suggest.test.tsx` (after re-tooling for client components which use `useTranslations` via NextIntlClientProvider wrapper instead).
- **`exactOptionalPropertyTypes` snags.** SuggestResponse fields are typed optional in our generated types; defaulted to empty arrays at the consumer (`data.products ?? []`). Optional `onClick` props need conditional spread (`{...(onSelect ? { onClick: onSelect } : {})}`) to satisfy the strict tsconfig. This is a recurring pattern; future shadcn-derived components will hit it again.
- **`replace_all` Edit pitfall.** During 7E I ran a `replace_all` on `data.symptoms → symptoms` that hit the `const symptoms = data.symptoms ?? []` line, creating a TDZ self-reference (`const symptoms = symptoms ?? []`). Caught by typecheck. Always preview the Edit's matches before `replace_all` on common identifiers.
- **OOS PDP screenshot reveals a polish item.** Active-ingredient chip renders "Парацетамол 500.000 mg" — trailing zeros from `Decimal` formatting. Phase 11 polish: trim trailing zeros + drop the decimal point when integer. Logged in CHANGELOG notes; not a blocker.
- **OQ-22 not reproduced this phase.** Categories endpoint behaved correctly throughout Phase 7. Per the Phase 6 close demotion, OQ-22 stays at "medium — reproduced once, self-resolved."

**Reversibility.** All new components are local. Embla is the marquee dep; the `ImageCarousel` props don't expose Embla types so a swap to vanilla scroll-snap + IntersectionObserver in Phase 11 is a focused edit (~50 LOC). The Suspense boundary on the in-stock PDP path can be flattened to a single `Promise.all` if streaming SSR proves unreliable in production. The R-E mitigation (locale-aware client) lives in two functions in `lib/api/client.ts`; if next-intl ever exposes a per-call locale override that does the same job, those two functions go away.

**References.** `DESIGN_BLUEPRINT §12.6 / §15 / §8.3`; `FRONTEND_BLUEPRINT §10 / §15.2 / §16`; `PRODUCT_BLUEPRINT §F-CAT-003 / §F-CAT-005 (P1) / §F-CAT-007 / §F-CAT-008 / §12 (Search & Discovery)`; `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 7`; backend `app/api/v1/{products,search}.py`, `app/domain/catalog/{storefront,search,storefront_schemas}.py`. Phase 7 plan in chat 2026-05-04.
