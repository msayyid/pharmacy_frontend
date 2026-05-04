# Build Progress

> Persistent state between sessions. Updated at every phase boundary. If you can't tell what's next from this file, it's wrong — fix it first. Format per `FRONTEND_CLAUDE_CODE_PROMPTS.md §Templates`.

---

## Current state

- **Active phase:** Phase 6 — Catalog Browse _(awaiting plan)_
- **Status:** Phase 5 complete; Phase 6 plan due before any Phase 6 code.
- **Last session:** 2026-05-03
- **Sub-phases done:** Phase 0 (master plan); Phase 1A-1F (Next.js 16 foundation); Phase 2A-2F (brand tokens + shadcn-Radix + composed-component skeletons + kitchen-sink); Phase 3A-3F (typed openapi-fetch client + ApiError + RSC/client fetchers + auth stubs + diagnostic route + CI types-check); fix(ci) post-Phase-3 (build-time env injection in CI workflow + `pnpm build:ci` script + CLAUDE.md amendments around the false-green local gate); Phase 4A-4F (next-intl@4.11 + locale-prefixed `[locale]/...` routing + middleware locale detection + 50-key `messages/{ru,ky,en}.json` with backend dotted-flat parity + locale-aware formatters in `lib/format/{price,date,number,phone}.ts` + LangSwitcher + i18n:check CI gate + 31 new tests); Phase 5A-5F (auth route handlers in `app/api/auth/*` + single-flight refresh + Zustand auth store + return-URL sanitizer + cart-merge sequential workaround + PhoneInput + OtpInput + `/[locale]/auth/otp` + `/[locale]/account` + `/[locale]/account/addresses` CRUD + middleware composing next-intl with auth gate + AppProviders + 123 unit/component tests + 14 e2e tests + i18n unflatten fix surfaced via the Playwright web-server log). All Phase 5 gates green; v0.5.0 tagged.
- **Next session should:** read `FRONTEND_CLAUDE_CODE_PROMPTS.md §Phase 6`, re-read `FRONTEND_BLUEPRINT §6 (route map)`, `§9.2-§9.4 (catalog routes)`, `§13 (data fetching patterns)`, `DESIGN_BLUEPRINT §11.1-§11.5 (product card / category list / symptom tiles)`, `PRODUCT_BLUEPRINT §16 (catalog browse)`. Fetch backend `app/api/v1/catalog.py`, `app/api/v1/categories.py`, `app/api/v1/symptoms.py`, `app/api/v1/branches.py`. Then post a Phase 6 plan covering: home page (RSC; symptom tiles + featured categories + "near you" branch picker stub); category index `/[locale]/c`; category detail `/[locale]/c/[slug]`; symptom tile click-through to filtered category list; branch picker placeholder per Q-6 deferral; product card (Phase 2 skeleton); empty/error states. No code until plan is approved.

---

## Phases

- [x] Phase 0 — Spec Comprehension & Master Plan _(done 2026-05-03)_
- [x] Phase 1 — Project Foundation _(done 2026-05-03; v0.1.0)_
- [x] Phase 2 — Design System Implementation _(done 2026-05-03; v0.2.0)_
- [x] Phase 3 — API Client + Type Generation _(done 2026-05-03; v0.3.0)_
- [x] Phase 4 — i18n Foundation _(done 2026-05-03; v0.4.0)_
- [x] Phase 5 — Auth & Account _(done 2026-05-03; v0.5.0)_
- [ ] Phase 6 — Catalog Browse (read-only) _(active — plan pending)_
- [ ] Phase 7 — PDP & Search
- [ ] Phase 8 — Cart
- [ ] Phase 9 — Checkout & Order Placement
- [ ] Phase 10 — Order History & Detail
- [ ] Phase 11 — Hardening: SEO, Perf, A11y
- [ ] Phase 12 — Storefront Launch Readiness
- [ ] Phase A1 — Admin Foundation & Login _(parallel after Phase 5)_
- [ ] Phase A2 — Admin Orders Queue & Picking
- [ ] Phase A3 — Admin Catalog CRUD
- [ ] Phase A4 — Admin Inventory & Receive Batches
- [ ] Phase A5 — Admin Reports
- [ ] Phase A6 — Admin Audit & Launch

---

## Smoke test recipes

> Concrete commands that prove the system works at each milestone. Run before declaring a phase complete; re-run on resume to confirm the repo is green.

### After Phase 1 — runway is up

```bash
pnpm install
pnpm dev &                  # serves on :3000
sleep 3
curl -s localhost:3000/api/health
# → {"status":"ok","version":"0.1.0"}
kill %1
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e
docker build -t nookat-storefront:dev .
docker run -d --rm -p 3000:3000 --name nookat-test nookat-storefront:dev
sleep 3 && curl -s localhost:3000/api/health
docker stop nookat-test
```

### After Phase 2 — design system live

```bash
pnpm dev
# Open http://localhost:3000/_kitchen-sink (dev-only route)
# Confirm: every shadcn primitive uses our tokens (no shadcn defaults)
# Confirm: Inter loads with Cyrillic glyphs (DevTools > Network: cyrillic subset)
# Confirm: prefers-reduced-motion shrinks all --duration-* tokens to 0ms
```

### After Phase 3 — typed API client

```bash
# Backend running on :8000
pnpm types:generate              # writes generated/api.d.ts
pnpm types:check                 # exits 0 if no drift
git diff generated/api.d.ts      # should be empty
pnpm typecheck                   # all imports of generated types compile
```

### After Phase 4 — i18n foundation

```bash
pnpm i18n:check                  # every key exists in all three locales
pnpm dev
# Visit /ru, /ky, /en — each renders with the correct strings
# Switch locale in header — URL prefix updates, page persists
# Confirm: Accept-Language header sent on API calls matches active locale
```

### After Phase 5 — auth flow live (J-01 partial)

> **Backend prerequisites (do these once on a fresh machine BEFORE `make dev`):**
>
> ```bash
> # 1. Free port 3306. MAMP, brew-services mysql, Docker Desktop's reused
> #    MySQL — any of them will keep the backend's MySQL container from
> #    binding. Symptom: `make docker-up` succeeds but the API can't connect.
> brew services stop mysql 2>/dev/null
> brew services stop mariadb 2>/dev/null
> # If MAMP is running, stop it from MAMP > Stop Servers.
>
> # 2. Bring up the dependency containers (MySQL + Redis).
> cd ../pharmacy_backend
> make docker-up
>
> # 3. Run Alembic migrations. The container starts with an EMPTY database;
> #    every backend route that touches a table 500s until this is run.
> #    This is the step that bit us during Phase 5's manual smoke.
> make migrate                    # or: uv run alembic upgrade head
>
> # 4. Start the API.
> make dev                        # uvicorn on :8000
>
> # In a second terminal, capture the log to a file the e2e helper can fish:
> make dev 2>&1 | tee /tmp/backend.log
> ```
>
> The e2e helper (`tests/e2e/auth-flow.spec.ts`) defaults to `BACKEND_LOG_PATH=/tmp/backend.log` and `BACKEND_OTP_CMD=tail -n 200 $BACKEND_LOG_PATH | grep -oE 'code[^0-9]{1,5}[0-9]{6}' | tail -n 1 | grep -oE '[0-9]{6}'`. Override either env var if your backend log shape differs. The `PHARMACY_BACKEND_SMS_PROVIDER=fake` default keeps OTP codes flowing to the log without actually hitting Nikita.

```bash
# Manual smoke (storefront on :3000, backend on :8000)
pnpm dev
# Browse /ru/auth/otp; enter +996 700 12 34 56
# Find OTP code: tail -n 30 /tmp/backend.log | grep -E 'code[":= ]+[0-9]{6}'
# Verify; redirected to /ru/account
# Browse /ru/account/addresses; add address with real Bishkek shape (мкр Асанбай 1/22, etc.)
# Reload; access token gone from memory; silent refresh fires; still logged in
# Logout; cookie cleared; /ru/account redirects to /ru/auth/otp?return=%2Fru%2Faccount

# Automated e2e (chromium; backend must be running):
pnpm e2e --project chromium --grep @requires-backend
# → tests/e2e/auth-flow.spec.ts: 2 passed
# Receipts from this run go in the phase-close summary alongside unit/component/CI green output.
```

### After Phase 9 — full J-01 (first-time symptom shopper)

```bash
# Fresh user, no auth, no cart
# /ru → Symptom tile → /ru/symptoms/headache → product card → /ru/products/{slug}
# Add to cart; cart icon updates; /ru/cart shows line
# /ru/checkout → enter address inline → confirm
# OTP gate: phone, code from backend log, verify
# Cart-merge workaround re-adds line (DECISION_LOG 2026-05-03); place order
# Confirmation page shows PH- order number
# Backend log shows place_order; database has order row with idempotency key cached
```

### After Phase 12 — launch readiness

```bash
# Staging deploy on Coolify
curl -sI https://staging.nookat.kg | grep -E '^(strict-transport|content-security|x-frame|referrer)'
# All security headers present
# Lighthouse against staging: ≥90 perf on / and /ru/products/<slug>; 100 a11y
pnpm e2e --config=playwright.smoke.ts --base-url=https://staging.nookat.kg
# All smoke tests pass
```

---

## Backlog

> Items deliberately deferred. Each entry should say WHEN it gets revisited.

### Phase 1.5+ (post-MVP, ~60 days)

- Card-online payment via Freedom Pay (gated on backend Q14). When live: enable card radio + redirect handling.
- Other non-COD payment methods (mbank, elsom, odengi, balance_kg, bank_transfer) — case-by-case post-launch.
- Phone-change flow on `/account/profile`. Backend needs to add a re-OTP-on-phone-change endpoint first.
- Search autocomplete UX polish (PRODUCT F-CAT-005).
- Active-ingredient filter on category pages (F-CAT-006).
- WhatsApp support button (alongside the phone CTA).
- A/B testing infrastructure (Statsig or homegrown).
- Analytics integration (Plausible or Yandex.Metrica) wired to PRODUCT §22.7 events.
- `@nookat/shared` published package if duplication between storefront and admin starts hurting.

### Phase 2+ (post-launch, ~6 months)

- Branch picker UI in header; geolocation-aware default. Backend needs to wire `X-Branch-Id` reading first (Q-6 flip).
- Backend ask: `POST /api/v1/cart/merge` endpoint (OQ-16). Replace the FE workaround with a single transactional call.
- Service worker / offline mode (Q-3 reversal).
- Real product photography to replace typography-led heroes.
- Notify-when-available, promotions, wishlist, native apps, push notifications, recall workflow, customer-receipt PDF.

### Pre-launch checklist (must close before production deploy)

- [ ] **KY translations reviewed by a local Kyrgyz pharmacist.** Coherent + complete is OK at MVP; polished is the pre-launch bar.
- [ ] **EN translations human-reviewed.** Machine translation is acceptable as a starting point; production gate is human review.
- [ ] **Real Nookat logo** swapped in (4-5 file edits per DESIGN §20). Owner provides before Phase 12.
- [ ] **Real support phone** replaces `+996 XXX XX XX XX` placeholder in `lib/brand.ts`.
- [ ] **Real license number** replaces `№XXXXX` placeholder.
- [ ] **Real Nookat physical address** in `lib/brand.ts`.
- [ ] Legal pages (Terms / Privacy / Delivery / Returns) reviewed by counsel; placeholder text replaced.
- [ ] CORS origins on backend include production storefront + admin domains.
- [ ] Sentry DSN configured (production project).
- [ ] Backend Q13 (Nikita SMS) closed → real OTP works in production.

---

## Cross-cutting reminders

- **Sacred invariants (CLAUDE.md):** no marketing scarcity; no symptom-to-prescription advice; no fake "best price" / "100% authentic" claims; customer support phone always one tap away; order numbers in `--text-mono` with `PH-` prefix; `Idempotency-Key` on every `POST /checkout/place`; refresh token NEVER in localStorage; no PII logged client-side; `/specs/*` read-only during build phases; tokens only — no raw hex / raw font-size / raw spacing.
- **Brand discipline.** Brand name lives only in `lib/brand.ts` (TS) + `messages/<lang>.json brand.{name,tagline}` (UI) + `public/brand/logo-*.svg` (visual). Code review gate: no literal "Nookat" outside those files.
- **Verification gate before "complete":** `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm e2e` — all green or the phase isn't done. "This should work" is forbidden.
