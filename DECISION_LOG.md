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
