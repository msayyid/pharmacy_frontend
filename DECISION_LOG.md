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
