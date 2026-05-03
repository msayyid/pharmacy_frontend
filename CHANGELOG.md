# Changelog

All notable changes to the Nookat storefront are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
