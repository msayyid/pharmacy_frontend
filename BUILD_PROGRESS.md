# Build Progress

> Persistent state between sessions. Updated at every phase boundary. If you can't tell what's next from this file, it's wrong — fix it first. Format per `FRONTEND_CLAUDE_CODE_PROMPTS.md §Templates`.

---

## Current state

- **Active phase:** Phase 4 — i18n Foundation _(awaiting plan)_
- **Status:** Phase 3 complete; Phase 4 plan due before any Phase 4 code.
- **Last session:** 2026-05-03
- **Sub-phases done:** Phase 0 (master plan); Phase 1A-1F (Next.js 16 foundation); Phase 2A-2F (brand tokens + 4 logo SVGs + shadcn pinned to Radix + Button/Badge/Card customizations + 5 composed-component skeletons + kitchen-sink dev page); Phase 3A-3F (Zod env schemas + openapi-typescript@7.13 generation + openapi.json snapshot + ApiError class + RSC + client fetcher factories + auth stubs with Phase 5 TODOs + diagnostic route + CI types-check gate + 19 new tests). All Phase 3 gates green; v0.3.0 tagged. **Diagnostic smoke verified end-to-end:** `curl /api/diag` returns real backend health + echoed X-Request-ID.
- **Next session should:** read `FRONTEND_CLAUDE_CODE_PROMPTS.md §Phase 4`, re-read `DESIGN_BLUEPRINT §17 (voice/tone)`, `§18 (localization)`, `FRONTEND_BLUEPRINT §13 (i18n)`, `PRODUCT_BLUEPRINT §16 (i18n strategy)`, `§21 (critical i18n keys)`. Fetch backend `app/i18n/{ru,ky,en}.json` + `app/core/i18n.py`. Then post a Phase 4 plan covering `next-intl` setup with `[locale]` URL prefix, `messages/*.json` mirrored from backend (~49 keys) + the FE-only namespaces (`nav`, `cta`, `header`, `footer`, etc. — see `MASTER_PLAN §4.2`), locale-aware formatters in `lib/format/{price,date,number,phone}.ts`, and `pnpm i18n:check` script. No code until plan is approved.

---

## Phases

- [x] Phase 0 — Spec Comprehension & Master Plan _(done 2026-05-03)_
- [x] Phase 1 — Project Foundation _(done 2026-05-03; v0.1.0)_
- [x] Phase 2 — Design System Implementation _(done 2026-05-03; v0.2.0)_
- [x] Phase 3 — API Client + Type Generation _(done 2026-05-03; v0.3.0)_
- [ ] Phase 4 — i18n Foundation _(active — plan pending)_
- [ ] Phase 4 — i18n Foundation
- [ ] Phase 5 — Auth & Account
- [ ] Phase 6 — Catalog Browse (read-only)
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

```bash
# Backend on :8000 with PHARMACY_BACKEND_SMS_PROVIDER=fake (default)
pnpm dev
# Browse /ru/auth/otp; enter +996 700 12 34 56
# Find OTP code in backend uvicorn log: grep sms_enqueued
# Verify; redirected to /ru/account
# Browse /ru/account/addresses; add address with real Bishkek shape
# Reload; access token gone from memory; silent refresh fires; still logged in
# Logout; cookie cleared; redirected to /ru
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
