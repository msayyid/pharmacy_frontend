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

---

### 2026-05-04 — Phase 8: Cart
**Phase:** 8
**Context.** Phase 8 is the cart half of J-01: guest cart cookie integration, add/update/remove flows with optimistic UI, drawer (desktop) + dedicated `/cart` page (both viewports), price-changed UX, stock-conflict UX, and the actual guest→user cart-merge handoff that Phase 5's `lib/cart/merge.ts` stub had been waiting for. Phase 9 picks up at checkout.

**Decisions.**

- **D1 — OP-13 throw-loudly contract.** Every cart fetcher in `lib/cart/queries.ts` + `lib/cart/mutations.ts` lets `ApiError` propagate. The catch-and-empty pattern from Phase 6/7 catalog (read-only) is **forbidden** for cart surfaces. Read-only `useCart()` ALSO throws (not catches) because consumers need to distinguish "empty cart" (`items.length === 0`) from "error fetching cart" (the throw → ErrorState). Verified at 8A close via `grep -rEn 'catch\s*\([^)]*\)\s*\{[^}]*return' lib/cart/*.ts` — zero matches. `merge.ts` (Phase 5) has a catch but accumulates per-item failures into a structured result, not silent degradation.
- **D2 — Cart UI: Drawer (desktop) + `/cart` page (both).** Mobile cart-icon click → `<Link href="/cart">`. Desktop cart-icon click → `<button onClick={openDrawer}>`. Both surfaces share the same CartLine + CartTotals components. CartDrawer globally mounted in `app/[locale]/layout.tsx` so any route can trigger it.
- **D3 — Optimistic for qty + remove only; add NOT optimistic.** Server-computed line ID + price_snapshot + line_total mean optimistic add would flicker for 150-300ms before snapping to truth. AddToCartButton shows a loading spinner during the request — feels snappier than fake-immediate-then-correct. Confirmed by user.
- **D4 — Rapid +/- clicks COLLAPSE into one PATCH per debounce window.** Critical semantics: user clicks +,+,+,+,+ in 600ms → local state advances 1→2→3→4→5→6 optimistically → 200ms debounce after LAST click → ONE `onChange(6)` fires → ONE PATCH to backend. NOT five chained PATCHes. `QuantityStepper` implements this via `useState` + `useRef` + a debounce timer in `useEffect`. Mutation queue per item ID via `mutationKey` is the safety net for the cross-pause case (user clicks, waits 250ms, clicks again — two PATCHes, dispatched in order). Verified in `tests/component/quantity-stepper.test.tsx` with `vi.useFakeTimers`.
- **D5 — OOS UX: red banner + "Удалить" only at MVP.** No suggested-alternatives — without a real algorithm + admin Phase A1+ data, suggestions devolve to "5 random products from same category" which is worse than nothing. Cold-chain UX deferred to checkout (Phase 9) where same-day-delivery / pickup confirmation already happens. Logged as OQ-23 (backend should expose `requires_cold_chain` on `CartItemRead`).
- **D6 — Price-changed UX: yellow info strip + "Обновить цену" CTA.** Action re-PATCHes the line with same quantity, which the backend interprets as a price snapshot refresh. Customer can also Remove the line if they don't accept the new price.
- **D7 — Cart query is "always fresh".** `staleTime: 0`; `refetchOnWindowFocus: true`. Per-mutation `invalidateQueries` triggers a refresh after every mutation settles.
- **D8 — Cart icon badge counts DISTINCT line items.** Matches Apteka.ru / Wildberries / Amazon convention. "3" means "I have 3 different things to review," not "I have 3 boxes of paracetamol." Confirmed by user — sum-of-quantities is wholesale-resale UX, which Nookat isn't.
- **D9 — UI store narrow.** `lib/cart/store.ts` is for `isDrawerOpen` + `lastAddedItemId` only. Cart DATA stays in TanStack Query cache per FRONTEND §11.2.
- **D10 — Sonner toast on add-to-cart success.** "Добавлено в корзину" + "Перейти в корзину" action button (opens drawer on desktop, no-op on mobile where the cart icon Link is the path). Sonner installed in Phase 2 but never rendered until 8D mounted the Toaster.
- **D11 — Localized error toast on mutation failure.** `t(\`error.\${code}\`)` with `error.generic` fallback. Cart-specific codes added to messages: `error.{cart_item_not_found, max_per_order_exceeded, product_not_found}`.
- **D12 — Locked OTP-verify merge sequence.** ORDER MATTERS comment at the top of the verify-success handler:
  1. POST /auth/otp/verify → tokens
  2. GET /cart (cookie still active = GUEST cart) → guestItems
  3. POST /api/auth/set-tokens (cookie now switches to user)
  4. mergeGuestCartIntoUser({ guestItems, client })
  5. queryClient.invalidateQueries(cartQueryKey)
  6. router.replace(returnUrl)

  Step 2 is a fresh `GET /cart` — NOT a cache read — per plan Q5. Cache-only loses items in the multi-tab case (user added in tab A, opened OTP in tab B where cache is empty). Extra GET is ~50-100ms on a path that already takes 1-2s for verify; cheap insurance against a "guest items lost on login" data-integrity bug class. Step 5 invalidates BEFORE step 6 redirects so `/cart` renders the merged cart immediately on landing — no "empty cart flash" per R-C mitigation.
- **D13 — Empty state reuses Phase 6 placeholder shape.** `/cart` with `items.length === 0` renders `<EmptyState title=cart.empty.title cta=Перейти к покупкам />` linking to `/categories`.
- **D14 — Add-to-cart enabled on ProductCard + PDP when in-stock.** Phase 6 D5 + Phase 7 D6 had these disabled awaiting Phase 8. Now: `<AddToCartButton productId={product.id} isInStock={product.is_in_stock} quantity={1} />`. PDP-page-local quantity stepper deferred to Phase 11 polish; for MVP the PDP always adds quantity=1 and the customer adjusts qty in the cart drawer / page after add.

**Side findings.**

- **Backend's branch_id mismatch with seed.** Backend's `BranchIdDep` hardcodes `branch_id=1` (Q-1 single-branch design). But the seed inventory (`dev/fixtures/inventory/seed.py`) creates `branches` rows with id=3 + id=4, never id=1. So the storefront catalog queries `branch_products WHERE branch_id=1` and gets nothing — explaining why ALL products read OOS in Phase 6/7 (we accepted "everything OOS" as legitimate empty-state). Phase 8 needed at least one in-stock product for happy-path smoke. Smoke fixture: insert `branches` row id=1 cloned from id=3, mirror `branch_products` rows. Documented in BUILD_PROGRESS.md > Phase 8 smoke recipe with apply + revert SQL.
- **OQ-24 — PDP is_in_stock asymmetry.** With the smoke fixture applied, catalog list endpoints correctly return 3 in-stock products. But `GET /products/par-500-20` returns is_in_stock=false. Different backend code paths in `app/domain/catalog/storefront.py`: catalog uses `get_category_with_products` (joins branch_products), product detail uses `get_product_detail` (cache key `v1:product:read:{slug}:{language_code}` — no branch_id, suggests different signal). Logged + escalated. Phase 8 workaround: cart-flow E2E adds via the category-page path; PDP CTA tested as disabled-OOS as a regression marker.
- **OQ-23 — Cold-chain field missing from CartItemRead.** `requires_cold_chain` is on `StorefrontProductDetail` (Phase 7) but not on `CartItemRead`. Cart-line cold-chain banner deferred until backend adds the field. Cold-chain UX shifts to checkout (Phase 9) where same-day-delivery / pickup confirmation already happens.
- **R-C held end-to-end.** The locked merge sequence ensures `invalidateQueries` runs BEFORE `router.replace`. Manually verified during 8E: added items as guest, ran OTP verify, immediately navigated to /cart — line preserved on first paint, no flash of empty-state. Permanent regression coverage at `tests/e2e/cart-merge.spec.ts`.
- **R-A held.** TanStack Query mutation queue per `mutationKey` + 200ms debounce in QuantityStepper handle rapid +/- clicks correctly. The debounce-collapses-to-one-PATCH contract is verified in `tests/component/quantity-stepper.test.tsx` with `vi.useFakeTimers`.
- **Embla in jsdom continues to limit multi-image carousel testing.** Phase 7's skipped test stays skipped; nothing new in Phase 8 needs that path.
- **Toast/Sonner integration smooth.** Toaster mounted in `app/providers.tsx` after NextIntlClientProvider so Sonner has access to the i18n context if needed (not used currently — toasts construct their own copy from `t()` at the call site).
- **`exactOptionalPropertyTypes` snag (recurring).** `ErrorState`'s `cta` prop expects ReactNode, not undefined. Wrapped retry with `Button variant="outline"` rather than tweaking ErrorState's interface — same pattern as Phase 7's null-handling.

**Reversibility.** All cart-side code is local. The cart-merge workaround can be deleted in one commit when backend lands `POST /api/v1/cart/merge` (OQ-16). The smoke fixture is dev-only environment state; the apply + revert SQL is documented for repeatability. The OP-13 contract is structural — every new cart-related fetcher (Phase 9 checkout) must follow the same throw-loudly pattern.

**References.** `DESIGN_BLUEPRINT §12.7 / §13.6`; `FRONTEND_BLUEPRINT §11 / §15.2 / §14.4`; `PRODUCT_BLUEPRINT §6 / §F-CART-001..005 / §7.1 (J-01 cart steps) / §11.2 (price-snapshot vs current)`; `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 8`; backend `app/api/v1/cart.py`, `app/domain/orders/{cart_service,schemas}.py`, `app/api/deps.py` (cart cookie + bearer-priority). Phase 8 plan in chat 2026-05-04. CLAUDE.md OP-13 (read-only catch-and-empty vs mutations throw-loudly) + OP-12 (audit FE plumbing first).

---

### 2026-05-04 — Phase 9: Checkout & Order Placement
**Phase:** 9
**Context.** Phase 9 closes J-01 with the checkout half: single-page `/[locale]/checkout`, the Idempotency-Key contract, structured stock + price conflict surfacing, and the order confirmation page. Backend is complete (`POST /api/v1/checkout/{quote,place}` + `GET /api/v1/me/orders/{order_number}` per the read-only v1.0.0-rc1).

**Decisions.**

- **D1 — `lib/checkout/use-quote.ts` is read-shaped despite POST verb.** The backend's POST /quote always returns the same shape for the same inputs; the verb is POST because the request body carries cart context, not because the call is a write. We wrap it in TanStack Query's `useQuery`. `queryKey: ["checkout-quote", delivery_method, payment_method, address_id, cartHash]` so the four legitimate refetch triggers (delivery / payment / address / cart) flip the key naturally. `staleTime: 0`.
- **D2 — Quote 200-with-conflicts is structured success; do NOT throw.** Per OP-13 + plan vigilance directive #1: when `stock_conflicts` or `price_conflicts` is non-empty on a 200 response, that's the backend's "your cart drifted; here's what changed" signal — not an error. Surface inline via ConflictBanner. 5xx + missing-data still throw loudly. Rationale: throwing on 200 would force the consumer to render an ErrorState for what is actually a "we caught the drift before you placed the order — fix your cart" calm signal. The user-visible difference is "warning amber tone with Edit-cart" vs "red error page with retry" — the calmer surface is correct.
- **D3 — Empty-cart guard is page-level, not middleware.** Middleware only knows about the auth cookie; cart membership requires `/api/v1/cart`. Adding that to middleware means forwarding cookies + a network hop on every navigation through every protected path — high cost for a single edge case. Page-level effect after `cartQuery` resolves: clean back-stack via `router.replace`, no flash on hydration because the effect waits for the query.
- **D4 — Idempotency-Key lifecycle: `useState` initializer mints once on mount; `consumeAutoRetry` enforces one-retry-max.** The lifecycle is in `lib/checkout/mutations.ts > useIdempotencyKey`. Four exposed fields: `key`, `mintCount`, `mintNewKey`, `consumeAutoRetry`, `resetAutoRetry`. `consumeAutoRetry()` returns `null` on the second call (the autoRetryFired flag is set on the first), enforcing the one-retry-max rule per the user's vigilance directive ("auto-mint-on-409 retry must be ONE retry MAX, not a loop"). Mint-on-cart-edit relies on natural component remount: when the user clicks Edit-cart → router.push to /cart → CheckoutForm unmounts → next mount runs `useState`'s initializer → fresh key. The `mintNewKey` API stays exposed for callers that need to force a refresh without remounting (none today, but useful for future flows).
- **D5 — ORDER MATTERS comment in TWO places.** First on `usePlaceOrder` in `lib/checkout/mutations.ts` (the contract). Second on `CheckoutForm` (the orchestrator) — duplicated so a reviewer touching either file sees the seven-branch sequence inline. Reordering or short-circuiting these branches breaks idempotency or order-placement integrity.
- **D6 — `payment_method` hardcoded to `cash_on_delivery` in TWO places.** Schema literal (`z.literal("cash_on_delivery")` in `lib/checkout/schema.ts`) + radio surface (`PaymentMethodSection` exposes only the COD option). Both must move together when Q14 (Freedom Pay) lands; the schema is the contract. Component-level comment locks in WHY card_online is hidden (deferred production blocker; surfacing without integration would land customers on a broken redirect).
- **D7 — `useWatch` over `form.watch` to avoid React Compiler "incompatible library" lint warning.** Same semantics; `useWatch` subscribes via RHF's internal store properly. The rule `react-hooks/incompatible-library` flags `form.watch()` because the function returned by `useForm` cannot be safely memoized; React Compiler skips memoizing the surrounding component. `useWatch` is the official escape hatch.
- **D8 — Quote-pending opacity dim (not skeleton) on the totals during refetch.** Items in ReviewBlock are pulled from `useCart` (stable until the user navigates back to /cart) so they don't flicker on quote refetch. Totals use `formatPrice` with `tabular-nums` and an opacity-dim during `isFetching`. First-load shows a skeleton; subsequent refetches show the previous numbers dimmed. Smoother than full-skeleton on every delivery_method toggle.
- **D9 — Confirmation page retry-fallback uses success framing.** Per plan vigilance directive #4: the GET that hydrates the order can race the backend's commit. Three attempts (initial + 2 retries via TanStack Query, exponential backoff capped at 5s). On retries-exhausted, render a SUCCESS-FRAMING fallback ("Order accepted, details in a few minutes, we'll call you within 10 minutes") — NEVER an error page, because the order has been placed (the 201 from /place is the source of truth; the GET failure is purely a UX concern, never a "your order failed" message).
- **D10 — `lib/observability/trace.ts` Sentry stub.** Five lifecycle events: `key_minted_on_mount`, `key_minted_on_request`, `key_minted_on_idempotency_conflict_auto_retry`, `auto_retry_refused_already_fired` (warning), `place_order_request_sent` / `place_order_response_ok`. Phase 11 swaps the body to `Sentry.addBreadcrumb({...})`; consumers don't change. Idempotency bugs are the hardest class to debug post-incident; the breadcrumb investment is intentional.
- **D11 — Cold-chain auto-toggle is wired but defensively typed.** OQ-23 (`requires_cold_chain` on CartItemRead) remains a backend ask. The CheckoutForm reads `(item as { requires_cold_chain?: boolean }).requires_cold_chain` so the surface activates the moment the backend adds the field. Until then, no cart line will trigger it. Toast copy lives at `checkout.cold_chain_toast.{title,body}` (added in 9A's i18n batch).
- **D12 — Address mutex enforced in superRefine + at the radio change site.** Schema's `superRefine` rejects `address_id` AND inline `address` simultaneously, AND requires one when delivery_method=delivery. AddressPicker's onPickSaved/onPickNew also clears the inactive field via `setValue` to keep the body shape clean before submit. Belt-and-suspenders: the form validation catches the structural violation; the runtime clear catches the case where a user toggles the radio between attempts.
- **D13 — Page-level prerequisites bundle (`useCheckoutPrerequisites`).** Cart + me + addresses fetched in parallel by a single hook, exposed to the page loader via three `Query` objects. Combined `isPending` flag drives the skeleton; combined `error` drives the ErrorState. The CheckoutForm orchestrator takes resolved data as props — pure presentational from the data-fetching perspective.

**Side findings.**

- **`lib/checkout/*` has zero catch blocks.** Stronger than the Phase 8 grep gate. Every fetcher throws via the openapi-fetch error middleware or via explicit `throw new ApiError`/`throw new Error`. Quote 200-with-conflicts is structured success surfaced inline; 5xx + missing-data + place-order failures all throw loud. OP-13 contract held end-to-end.
- **React Compiler lint surfaces twice.** First on `form.watch` (D7 — switched to `useWatch`). Second on a transient `useRef`-based "track last submitted hash" — the lint rule `react-hooks/refs` flagged passing a function that reads a ref into `form.handleSubmit`. Removed the ref entirely; the natural component-remount cycle handles the same job. Lesson: when the lint surfaces this kind of warning, check if the ref is actually load-bearing or if a simpler React pattern (state, remount, or a callback closure scoped to the event) does the same job.
- **Order-number monospace via inline style.** Components use `font-mono` Tailwind class plus an inline `style={{ fontFamily: "var(--font-mono, ui-monospace)" }}` because the design tokens expose `--font-mono` as a CSS variable. The fallback to `ui-monospace` is the system-default monospace face; `--font-mono` is intentionally not in `tailwind.config.ts`'s `fontFamily` map yet (Phase 11 polish). Sacred-invariant #5 satisfied either way.

**Reversibility.** Every checkout-side concern is local. When Q14 (Freedom Pay) lands, two coordinated edits widen the contract: `payment_method` literal in `schema.ts` becomes a union, `PaymentMethodSection` grows a second radio, `usePlaceOrder`'s success branch already handles `payment_redirect_url` (wired today, never reachable until Q14). The Sentry stub becomes a one-line swap in Phase 11. The Idempotency-Key lifecycle is portable to admin or future flows that need server-side dedup.

**References.** `DESIGN_BLUEPRINT §12.8 / §12.9 / §13.7`; `FRONTEND_BLUEPRINT §6.3 / §12 / §14`; `PRODUCT_BLUEPRINT §F-CHK-001..005 / §7.1 J-01 final steps`; `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 9`; backend `app/api/v1/checkout.py`, `app/domain/orders/{checkout_service,order_service,schemas}.py`. Phase 9 plan in chat 2026-05-04. CLAUDE.md OP-13 (mutations throw loudly) + sacred-invariant #5 (order-number monospace) + sacred-invariant #6 (Idempotency-Key on every place).

---

### 2026-05-04 — Phase 10: Order History & Detail
**Phase:** 10
**Context.** Phase 10 ships the customer-facing order history list (`/[locale]/orders`) and extends the 9E confirmation page (`/[locale]/orders/[orderNumber]`) into a full detail view with status timeline, cancel, and reorder. The 9E success-framing fallback (D9) STAYS — `useOrder` retries up to 2x with exp-backoff and the page renders the calm fallback on retries-exhausted, never an error page.

**Decisions.**

- **D1 — OP-13 carve-out clarification: `lib/orders/*` is the strictest yet.** Read-only `useOrderList` and `useOrder` BOTH throw loudly on missing data. The catalog catch-and-empty contract from Phase 6/7 (`lib/api/catalog.ts`) is FORBIDDEN here — orders are personal data, not browse surfaces. Empty list (`items.length === 0`) is a legitimate empty-state distinguished from fetch failure. Grep gate at every sub-phase boundary verified zero `catch` blocks across the entire `lib/orders/*` surface (stronger than required; matches Phase 9's gate).

- **D2 — Polling shape: poll the full `useOrder` GET, not the slim `/status` endpoint.** Plan Q1 default. One cache surface to invalidate beats two; single-order detail bandwidth is negligible (sub-1 KB JSON). The slim `GET /me/orders/{n}/status` endpoint is purpose-built for polling but adds a second cache and complicates cancel/reorder invalidation (would need `setQueryData` splice into BOTH cache entries). Held in reserve if perf telemetry shows otherwise.

- **D3 — Q-12 polling cadence wired exactly per Phase 0.** `useOrder` uses `refetchInterval = isTerminal(status) ? false : 60_000`, `refetchIntervalInBackground: false`, `staleTime: 0`. Background tabs pause; terminal states stop. Test coverage: not a unit test (TanStack Query's polling is internal); verified by manual smoke against the live backend per BUILD_PROGRESS.md Phase 10 recipe.

- **D4 — `<OrderNumber>` centralization for sacred-invariant #5.** Phase 9E shipped the `font-mono` + inline `style={{ fontFamily: "var(--font-mono, ui-monospace)" }}` pattern at one site (the confirmation page). Phase 10's surfaces multiply the count to ≥4 (list row, detail header, cancel dialog body, reorder toast). Centralizing in a 30-LOC component prevents drift. The inline style stays because `--font-mono` isn't in `tailwind.config.ts`'s `fontFamily` map yet (Phase 11 polish).

- **D5 — Reorder gating: terminal states only (Q2 default).** `<ReorderButton>` renders when `isTerminal(order.status)` (delivered / cancelled / refunded). Backend allows reorder from any state, but rendering during in-flight pickup/delivery competes with the active order's intent. The J-02 "buy this again" path is clearly post-closure. If a customer needs to reorder mid-flight, the support phone is one tap away (sacred-invariant #4).

- **D6 — Cancel-reason UX: free-text textarea, 500-char cap (Q3 default).** Mirrors backend cap. The backend's `CANCEL_REASONS` frozenset is admin-only — the customer endpoint accepts any string ≤500. Constrained dropdown rejected as overengineering for a low-signal field; the customer's reason is informational, not load-bearing on inventory return / payment refund (those run unconditionally on cancel).

- **D7 — Locked invalidate-then-push reorder sequence (Phase 8 D12 R-C echo).** `useReorder` `onSuccess` `await`s `invalidateQueries(cartQueryKey)` BEFORE returning so the consumer's `router.push("/cart")` lands on the merged cart with no flash of empty-state. Test-locked via `invalidateSpy.invocationCallOrder[0] < routerPush.invocationCallOrder[0]`.

- **D8 — Cancel `setQueryData` splice for instant timeline update.** `useCancelOrder` `onSuccess` writes the freshly-mutated `OrderRead` (which includes the appended history row + flipped status + `cancelled_at`) into `orderQueryKey(orderNumber)` directly. The `<StatusTimeline>` re-renders instantly with the new state — no round-trip needed. `onSettled` invalidates `["orders", "list"]` so the list page refreshes the row's status pip on next visit.

- **D9 — Page-based pagination, state in component state (NOT URL).** `useOrderList` is page-based via `useQuery` (NOT `useInfiniteQuery`). Page state lives in `React.useState`, NOT in `?page=` query string, because (a) orders are auth-gated personal data — no SEO need to crawl per-page URLs, (b) cancel/reorder mutations bumping the user back to page 1 simplifies invalidation. The `<OrderListPagination>` component is a client-side mirror of `components/catalog/Pagination.tsx` (which is RSC and uses `getTranslations` server-only).

- **D10 — Snapshot immutability test-locked.** `OrderItemsBlock` test stubs `globalThis.fetch` with `vi.fn()` and asserts zero calls during render. Sacred guarantee — any future refactor that quietly adds a PDP refetch breaks the test. Per CLAUDE.md > Domain reality: "the snapshot IS the order; never refetch product detail to override".

- **D11 — Backend cancel/reorder error i18n gap.** `error.order_not_found`, `error.forbidden_order`, `error.order_not_cancellable_by_customer` are NOT in `app/i18n/{ru,ky,en}.json`. The codes round-trip via FE keys only. Per OP-12 (audit FE plumbing first): the codes ARE present in `app/domain/orders/order_service.py`'s `raise NotFoundError(code=...)` / `raise PermissionDeniedError(code=...)` / `raise ConflictError(code=...)` calls. Backend ProblemDetails will surface them. FE adds them × 3 locales as a complete-loop mirror; if backend later adds these to its i18n file, the FE keys are already aligned.

- **D12 — `<OrderListPagination>` as a separate client component, not a refactor of `Pagination.tsx`.** The catalog Pagination is RSC (uses `getTranslations` from `next-intl/server`). Phase 10's order list page is a Client Component (consumes TanStack Query). Splitting them avoids RSC/client-bridge gymnastics and keeps each component's API natural. ~80 LOC duplication accepted; if a third pagination surface lands, extract a shared mini-helper for `buildPageList`.

- **D13 — Dockerfile env-stub injection.** `pnpm build:ci` set the precedent — `lib/env/server.ts` Zod-parses `API_URL`/`NEXT_PUBLIC_*` at module import, and `next build`'s page-data collection fails without them. `scripts/build-ci.sh` injects placeholder values (mirrored to `.github/workflows/ci.yml`). The Dockerfile builder stage was missing the same injection — `docker build` failed during `pnpm build`. Phase 10 close fix: add the same `ENV NEXT_PUBLIC_API_URL=http://localhost:8000 ...` block to the Dockerfile builder stage. Real prod values come from Coolify at runtime; these are CI-safe placeholders. KEEP IN SYNC with `scripts/build-ci.sh` and `.github/workflows/ci.yml` (commented inline).

- **D14 — `common.retry` i18n key added (210 × 3 parity).** The existing `cart/page.tsx` uses `t("error.generic")` as the retry CTA label — buggy pre-existing copy ("Что-то пошло не так..." inside a button). Phase 10's `/orders` ErrorState retry button needed a proper "Try again" copy, so a single `common.retry` key was added × 3 locales. Existing `cart/page.tsx` not touched (out of Phase 10 scope; Phase 11 polish opportunity).

**Side findings.**

- **shadcn AlertDialog install clobbered our customized button.tsx.** Running `pnpm dlx shadcn@latest add alert-dialog -y -o` "updated" `components/ui/button.tsx`, dropping our Phase 2 D4 customizations (the `loading` prop + spinner injection). Caught by `git diff` immediately; restored via `git checkout -- components/ui/button.tsx`. **Lesson re-confirmed: every shadcn install needs a `git diff` audit immediately after, even with `-o` (overwrite-with-prompt).** This was the failure mode Phase 7 D14 already warned about.
- **Sonner needs `window.matchMedia` for its Toaster mount; jsdom doesn't provide it.** Two viable test patterns: (1) stub `matchMedia` in `tests/setup.ts` globally, (2) mock `sonner` in the specific test file. Phase 10D + 10E went with (2) — local mocking via `vi.mock("sonner", () => ({ toast: { success: spy, error: spy, ... } }))` keeps the test scope focused on dialog/button UX, not Sonner's render path. Documented now so future test files don't re-discover the same gotcha.
- **Pagination test pattern.** `getByText` over locale-aware `formatPrice` output is fragile — "240 сом" matches both the line total and the "1 240" subtotal substring. Either use `getAllByText` + count, or anchor on a more specific surrounding pattern (`/2\s*×\s*120\s*сом/u`). Phase 10C tests use the anchored pattern.

**Reversibility.** Every Phase 10 decision is local. Polling cadence flips by changing one constant in `useOrder`. Reorder gating widens by removing the `isTerminal` check. The Dockerfile env-stub block can be deleted the day someone refactors `lib/env/server.ts` to defer parse-time. The `setQueryData` splice in cancel can be replaced with a plain `invalidateQueries` if the cache splicing turns out to mask edge cases — at the cost of a 60s round-trip flicker before the timeline updates.

**References.** `DESIGN_BLUEPRINT §12.10 / §13.x / §14.1 / §15.1`; `FRONTEND_BLUEPRINT §13`; `PRODUCT_BLUEPRINT §F-ORD-001..005 / §F-ACC-004 / §7.x J-02`; `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 10`; backend `app/api/v1/me_orders.py`, `app/domain/orders/{order_service,schemas,lifecycle}.py`. Phase 10 plan in chat 2026-05-04. CLAUDE.md OP-13 (orders are personal data, no carve-out) + sacred-invariants #4 / #5 / #8 / hard-prohibition #16.

---

### 2026-05-04 — Phase 11: Hardening (SEO, Perf, A11y, Sentry, Security headers)
**Phase:** 11
**Context.** Polish-pass that takes the storefront from feature-complete to production-ready: SEO metadata everywhere, JSON-LD on indexable surfaces, sitemap + robots, Sentry SDK wired (no-op without DSN), Web Vitals → Sentry, structured logger + PII scrubber, error/not-found/global-error boundaries, RSC loading skeletons, security headers, axe sweep (vitest + e2e), bundle analyzer. Plan approved with defaults; no scope changes mid-execution.

**Decisions.**

- **D1 — Sitemap fan-out strategy: top-of-each-root-category enumeration.** Backend has no "list all product slugs" endpoint. We could iterate every category tree leaf, but at MVP the catalog is small (≤5 root × ≤200 products) so we fetch the first page (page_size=100) of each ROOT category once, dedupe by slug, and emit. Bounded fan-out at build time. When the catalog grows past ~500 products, swap to a paginated walk or ask backend for `/api/v1/sitemap-products`. Sitemap output also includes static routes × 3 locales + categories tree (recursive flatten) + symptom slugs. **Phase 6 OP-13 catch-and-empty contract holds at sitemap level too** — backend down at build time degrades to static routes only rather than crashing `next build`.

- **D2 — Hard-gated routes get noindex + robots.txt disallow (belt-and-suspenders).** Cart, checkout, orders, account, auth/otp are personal/transactional and never useful in search results. Two layers: (1) `app/robots.ts` disallows `/*/cart`, `/*/checkout`, etc. so well-behaved crawlers never even fetch them. (2) Each segment has a thin Server Component `layout.tsx` that exports `metadata.robots = { index: false, follow: false }` so any crawler that DOES fetch sees the meta robots tag and skips indexing. Belt-and-suspenders is intentional: search engines occasionally fetch disallowed paths to verify content, and we want a defensive second signal.

- **D3 — Hard-gated layouts as Server-Component pass-throughs.** Each hard-gated page is a Client Component (TanStack Query / form state / polling). Client Components can't export `metadata`. Solution: thin Server-Component `layout.tsx` whose only job is `generateMetadata` + `return <>{children}</>`. Five tiny files (cart/checkout/orders/account/auth) covering all hard-gated routes (account/addresses inherits from /account/layout.tsx). Cleaner than restructuring pages to RSC + client island for this purpose alone.

- **D4 — JSON-LD `dangerouslySetInnerHTML` exception, scoped + grep-guarded.** CLAUDE.md hard-prohibition #11 forbids dSI for backend-returned text content (malformed-API-bytes threat model). JSON-LD breaks the rule because React doesn't render `<script>` text-node children — Next's own docs recommend dSI for this exact case (https://nextjs.org/docs/app/guides/json-ld). Decision: scope dSI to `lib/seo/jsonld.tsx` only; serialize via `JSON.stringify` over a typed object then escape `<`, `>`, `&` to their unicode-escape forms (per OWASP) so a malicious string field cannot produce a literal `</script>`. Verification gate: `grep -rEn 'dangerouslySetInnerHTML' app/ components/ lib/ | grep -v 'lib/seo/jsonld.tsx'` returns empty. If a future surface needs HTML rendering (legal pages with formatted markup), add a DOMPurify wrapper and document a second exception.

- **D5 — Sentry SDK shipped without DSN; no-op contract until Phase 12.** `@sentry/nextjs` v10's `Sentry.init({ dsn: undefined })` is a runtime no-op (tested in their docs). Phase 11 ships the SDK config files (`instrumentation.ts` + `sentry.{server,edge}.config.ts` + `instrumentation-client.ts`) so the wiring pattern is exercised by typecheck + build, but no events flow until Phase 12 / Coolify deploy injects a real DSN. Trade-off: the prompt's DoD says "Sentry receives errors in staging" — that requires staging deploy, which is Phase 12 territory. We accept the carve-out: DoD item flips to "verified post-deploy in Phase 12" (already in pre-launch checklist).

- **D6 — PII scrub at two layers (defense in depth).** `scrubPii` runs (1) at `trace()` call site — before `Sentry.addBreadcrumb` receives data; (2) at `beforeSend` — on every breadcrumb's `data` and `request.data` reaching the SDK boundary. Either layer alone would suffice for sacred-invariant #8; both means a future consumer accidentally bypassing one still hits the other. Field-name regex (not value regex): scrubbing string values that "look like phones" would corrupt order numbers (`PH-2026-12345`) and SKUs (`PAR-500-12`). The known-PII keys are an explicit list mirroring backend `app/i18n/sms.json` field names + auth tokens. Cycle-safe via WeakSet.

- **D7 — Web Vitals are wired but invisible until DSN.** `useReportWebVitals` fires on every navigation; without DSN the breadcrumbs go nowhere. Cost: one tiny client component (`<WebVitalsReporter />`) — already justified by the providers wrapper that hydrates on every route. Phase 12 close verifies staging Sentry receives them.

- **D8 — Structured logger (`lib/log.ts`) is a thin wrapper over `trace()`, not a parallel system.** Single destination (Sentry breadcrumbs + dev console echo). Why ship both `trace()` and `log()`? Naming clarity. `trace()` is the primitive used inside `lib/checkout` / `lib/orders` for idempotency-key + cancel/reorder lifecycle (terminology aligned with the underlying Sentry API + with backend trace events). `log()` is the application-level convenience for ad-hoc consumers — same destination, more conventional shape. Two interfaces, one funnel.

- **D9 — Loading skeletons on RSC-fetching segments only.** `loading.tsx` files added to `categories/[slug]`, `products/[slug]`, `symptoms/[slug]`, `search`. Not added to: index pages (cheap fetches; skeleton flash is net-negative on cable), about (single small render), or the hard-gated Client Component pages (TanStack Query owns its own pending state). Pattern is RSC-streaming: `loading.tsx` is shown while the segment's RSC fetch in `page.tsx` resolves. PDP loading skeleton mirrors above-fold layout shape (square carousel + name + price + CTA) so CLS is minimized.

- **D10 — `app/[locale]/error.tsx` Client Component, `app/[locale]/not-found.tsx` RSC.** error.tsx requires `"use client"` per Next 15 contract — it owns the `reset()` callback. not-found.tsx is fine as RSC (just renders, no event handlers). `app/global-error.tsx` is bare HTML (no provider context available; uses `BRAND.supportPhone` constant + English copy).

- **D11 — Centralized axe contract over per-test sprinkling.** Two reasonable places to put axe: (a) one `expect(await axe(container)).toHaveNoViolations()` per existing component test (high friction — each test owns its own provider stack and jsdom shims), or (b) a dedicated `tests/component/axe-pattern-coverage.test.tsx` that renders representative design patterns (EmptyState, ErrorState, StatusPip, OrderListRow, OrderListPagination). Picked (b): easier to extend, easier to audit, single jsdom setup, single AXE_OPTIONS for color-contrast disable (jsdom can't compute color-contrast accurately). E2E covers full-page color-contrast in real browser via `@axe-core/playwright`.

- **D12 — Phase 11 a11y gate is critical-only; serious-tier deferred to pre-launch human polish.** Phase 11 prompt DoD says "axe scan: zero critical." First-run e2e found ~4 nodes/page of serious-tier color-contrast violations on muted-ink tokens (header/footer copy on light surface, OTP form labels) plus `<dl>` structural issue on /ru/about. None are critical. Decision: hard-fail on critical only; surface serious-tier as console warnings; track in BUILD_PROGRESS > Backlog > A11y polish for pre-launch human review (alongside KY translation review and real-content swaps). Tightening the gate to serious-tier later is a one-line change in the e2e helper.

- **D13 — `vitest-axe@0.1.0` matcher hand-wiring.** The package's `dist/extend-expect.js` ships empty (entrypoint regression in 0.1.0); `import "vitest-axe/extend-expect"` is a no-op. Worked around: import matchers directly (`import * as axeMatchers from "vitest-axe/matchers"`), call `expect.extend(axeMatchers)` in `tests/setup.ts`. Custom `tests/vitest-axe.d.ts` augments `vitest`'s `Assertion` interface so TypeScript sees the matcher. If vitest-axe ships a fix (1.x or later), drop the manual extend and the .d.ts.

- **D14 — Security headers in `next.config.ts`, NOT CSP.** Per FRONTEND_BLUEPRINT §18.1, CSP belongs to the reverse proxy (Caddy / Coolify Traefik) because policy varies per-environment more than the app build. Phase 11 ships the four flat headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy); CSP wires at Phase 12 staging deploy.

- **D15 — `@next/bundle-analyzer` opt-in via ANALYZE env.** Default `pnpm build` is unchanged so CI build times don't regress. `ANALYZE=true pnpm build` (or `pnpm analyze`) emits `.next/analyze/{client,server,edge}.html`. No assertions on bundle size yet — §17.1 budget verification is ad-hoc local at MVP; LHCI in Phase 12 against staging.

- **D16 — Docker smoke regression: `/sitemap.xml` requires `API_URL` at request time.** Phase 10's docker smoke worked without `API_URL` env passed to `docker run` because no fetcher imported `lib/env/server.ts` at request time (`/api/health` is env-free; `/ru/orders` is a Client Component that reads env in API calls only when the user is authed). Phase 11A's `/sitemap.xml` enumerates the catalog at request time and pulls `serverEnv.API_URL` through `createServerApiClient` → `lib/env/server.ts` Zod parse (Phase 3 D11: fail loud on import). Without `API_URL`, the import chain crashes. Decision: update BUILD_PROGRESS smoke recipe to pass `-e API_URL=...` to `docker run`. Real prod injects via Coolify env. Refactoring `lib/env/server.ts` to defer parse-time was rejected (the Phase 3 D11 contract is "fail loud on import" — degrading that to "fail at request time" weakens the import-time guarantee for the wrong reason).

**Side findings.**

- **`vitest-axe` 0.1.0 ships empty `extend-expect.js`.** Logged above (D13). The package's matcher logic itself works fine; it's just the convenience entrypoint that's broken.
- **next-intl middleware deprecation warning** during e2e run: "The 'middleware' file convention is deprecated. Please use 'proxy' instead." Phase 4 RISKS R-13 already tracks this; next-intl 4.11 doesn't yet expose a `proxy` export. Will revisit when next-intl publishes a migration path.
- **DM_Serif_Display unused warning** (next/font/google) is stable across phases — kept because the kitchen sink renders it. Removing is a Phase 12 polish if we drop the kitchen sink before launch.

**Reversibility.** Every Phase 11 decision is local and reversible:
- Sitemap: change fan-out strategy by editing `app/sitemap.ts`.
- noindex layouts: delete the layout files; the parent metadata template applies.
- JSON-LD: delete the `<JsonLd>` blocks from indexable pages and `lib/seo/jsonld.tsx`; nothing else depends on them.
- Sentry: drop `SENTRY_DSN` env to disable; or delete the four config files entirely (consumers of `trace()` already tolerate no-DSN).
- A11y gate threshold: edit one filter in `tests/e2e/a11y-flow.spec.ts`'s `expectNoCritical`.
- Security headers: edit one `async headers()` block in `next.config.ts`.
- Bundle analyzer: drop `withAnalyzer` wrap.

**References.** `FRONTEND_BLUEPRINT §17 (perf budgets) / §18 (security) / §19 (Sentry) / §20 (testing)`; `DESIGN_BLUEPRINT §14 (empty/loading/error) / §16 (a11y)`; `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 11`; CLAUDE.md sacred-invariants #4 / #8 + hard-prohibition #11. Phase 11 plan in chat 2026-05-04.

---

### 2026-05-05 — Phase 12: Storefront launch readiness (v1.0.0-rc1)
**Phase:** 12
**Context.** Final phase before the storefront serves real customers. Mostly polish + ops glue — the highest ratio of "human work" to "code work" of any phase. The prompt's DoD is partially blocked by infrastructure not-yet-stood-up (Coolify project, real DSN, real legal text, real logo). Decision: ship code-side completeness now, tag `v1.0.0-rc1`, document the human-work gates in `LAUNCH_CHECKLIST.md` so the launch path is unambiguous.

**Decisions.**

- **D1 — Legal pages live at `/[locale]/legal/{terms,privacy,delivery,returns}`, not `/[locale]/{terms,...}`.** Phase 12 prompt suggested the unprefixed path, but Phase 6 6A already wired the footer with `/legal/...` paths. Matching the existing convention avoids broken-link rework + footer audit churn.

- **D2 — Single `<LegalPlaceholderShell>` component, not 4 inlined shells.** Saves ~80 lines of duplication; consistent placeholder banner across all 4 routes; one file to update when the placeholder UX is refined. Per-page differentiation is just the title prop.

- **D3 — Legal placeholders are `noindex,nofollow`.** Real legal text gates production launch (the placeholder is for staging soak). We don't want Google caching the "this is a placeholder" copy. When real text lands: flip `robots: { index: true, follow: true }` per page AND add the routes to `app/sitemap.ts` (currently excluded — there's no SEO value in indexing placeholders).

- **D4 — Smoke suite is READ-ONLY at MVP.** Phase 12 prompt mentions "A test user can OTP-login (using a known dev SMS code via API)" and "Place order goes through" as smoke items. Both rejected for staging:
  - **OTP smoke** would require backend's `PHARMACY_BACKEND_SMS_PROVIDER=fake` adapter live on staging (defeats the point of staging being prod-shaped) OR a real Nikita SMS round-trip (Q13 deferred — unavailable + costs money).
  - **Place-order smoke** would litter the staging DB with test orders that look real to operators and confuse fulfillment QA. Worse, an accidental smoke run against production would create real fake orders.
  Trade-off: mutation paths are covered by the e2e `@requires-backend` suite against a known local backend, not against staging. Staging soak relies on (a) read-only smokes catching deployment regressions, (b) Sentry catching runtime errors, (c) human QA following the manual smoke recipes in `BUILD_PROGRESS.md > Smoke recipes > After Phase 9` (J-01 happy path). When backend Q13 lands real Nikita SMS in production, we can add a happy-path smoke against a fixed test phone in production-shadow mode.

- **D5 — `playwright.smoke.config.ts` separate from `playwright.config.ts`.** Two reasons: (1) smoke must NOT spin up a dev server (`webServer` block must be absent — staging is the source of truth); (2) smoke uses a different testDir + naming pattern (`*.smoke.ts`) so `pnpm e2e` doesn't accidentally pick up smoke tests when a developer just wants the local CI gate. The split is small and the configs share nothing material.

- **D6 — `LAUNCH_CHECKLIST.md` cross-references rather than duplicates.** Pre-launch backlog items already live in `BUILD_PROGRESS.md > Backlog > Pre-launch checklist` (assembled across Phases 5 / 9 / 11). Duplicating them in `LAUNCH_CHECKLIST.md` would create drift; linking them keeps a single source of truth. Updates to the backlog automatically reflect in the checklist's gate.

- **D7 — Six grep gates in `scripts/launch-checks.mjs`, comment-line filter is the trick.** First run flagged 12 brand-discipline "violations" + 3 confirm/alert "violations" — every one was a JSDoc comment legitimately mentioning the term. Filter (lines whose first non-whitespace is `//` / `*` / `/*`) brought the offender count to zero. Without the filter the gate would be untrustworthy and operators would learn to ignore it. With the filter the green output is meaningful.

- **D8 — `lib/seo/jsonld.tsx` allowed to use literal "Nookat"/"Ноокат".** The PostalAddress JSON-LD blocks have `addressLocality: locale === "en" ? "Nookat" : "Ноокат"` — but here "Nookat"/"Ноокат" is the *city name*, not the brand wordmark. Routing through `BRAND.nameLocalized` would conflate brand and city semantics (the brand happens to be named after the city). Adding `lib/seo/jsonld.tsx` to the allowlist is more correct than refactoring the JSON-LD to use BRAND constants for what should be a postal-address field.

- **D9 — `app/global-error.tsx` exempt from the raw-hex grep gate.** This file intentionally uses inline `style` with hex literals because it must render WITHOUT the React/Tailwind/next-intl provider chain (it's the boundary that fires when those providers themselves crash). Exempting it is correct; flagging it would force us to either inline a Tailwind reset (which defeats the bare-HTML safety net) or split a CSS file (which also requires Next routing to work).

- **D10 — Health endpoint `force-dynamic`, not `force-static`.** Previous `force-static` handler froze `version` and ignored runtime env. Coolify operators need `curl /api/health` to return the actual running build. `force-dynamic` reads `process.env.NEXT_PUBLIC_ENV` + `SENTRY_RELEASE` at request time, which is what Coolify injects post-build. Cost: one render per health-check (every 30s in our config) — negligible.

- **D11 — Health endpoint `sha` field gated to non-production.** Returning git SHA helps Coolify operators verify deploys, but in production the SHA is information that doesn't need to be public (a curl from anywhere would reveal it). Trade-off: production loses some debug convenience; gain is one less data leak. Operators with VPS access can still read SENTRY_RELEASE from Coolify directly.

- **D12 — Dockerfile runtime stage gets fallback ENV.** Phase 11F surfaced the gap: `/sitemap.xml` started pulling `lib/env/server.ts` at request time, and `docker run` without `-e API_URL=...` flags hit a ZodError. Phase 12E fix: ENV block in the runtime stage with dev-shaped fallbacks. Real Coolify deploys override these via the project's env panel; the fallback is for local docker-run smoke convenience. This is NOT a contract weakening — `lib/env/server.ts` still Zod-fails on missing env per Phase 3 D11; we're just providing dev defaults at the container boundary so the smoke path doesn't surprise developers.

- **D13 — Tag is `v1.0.0-rc1`, not `v0.12.0`.** Per CLAUDE.md OP-11: "Phase 12 = `v1.0.0-rc1`". This carves out from the otherwise mechanical `v0.N.0` pattern because Phase 12 is the production-readiness gate, and the tag's semver communicates "release candidate, soaking before `v1.0.0`." The full `v1.0.0` tag lands after `LAUNCH_CHECKLIST.md > Final gate` is checked (real legal text + KY/EN review + Coolify staging soak + production deploy).

**Side findings.**

- **next-intl middleware deprecation warning** (RISKS R-13) still fires on every dev/build/e2e run. next-intl 4.11 still doesn't expose a `proxy` export. Re-evaluate at admin Phase A1+ (admin will need its own middleware composition; that may force a migration).
- **DM_Serif_Display unused warning** still fires. Kitchen-sink uses it; can drop both the font and the kitchen sink in a future cleanup pass if we decide the kitchen sink is dev-only debt.
- **Health endpoint's `import packageJson with { type: "json" }` syntax.** Modern import-attributes syntax; supported in Next 15 + TS 5.5+. Replaces the previous hardcoded `APP_VERSION = "0.1.0"` string.

**Reversibility.** Every Phase 12 decision is local + reversible:
- Legal placeholders: replace shell content with real text per page; flip `robots`.
- Smoke suite: extend to mutation tests when staging is ready for fake-SMS happy paths.
- LAUNCH_CHECKLIST: pure documentation; rewrite freely.
- Grep gates: turn off any check by deleting its `check(...)` block.
- Dockerfile fallback ENV: delete the runtime ENV block; consumers must pass `-e` flags again.
- Health endpoint: revert to static if request-time env reads turn out to cause issues at scale.

**References.** `FRONTEND_BLUEPRINT §22 (build/deploy)`; `DESIGN_BLUEPRINT §21 (conventions checklist)`; `FRONTEND_CLAUDE_CODE_PROMPTS §Phase 12`; `CLAUDE.md > Sacred invariants / Hard prohibitions / OP-11 (tag convention)`. Phase 12 plan in chat 2026-05-05.
