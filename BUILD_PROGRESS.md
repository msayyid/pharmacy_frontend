# Build Progress

> Persistent state between sessions. Updated at every phase boundary. If you can't tell what's next from this file, it's wrong — fix it first. Format per `FRONTEND_CLAUDE_CODE_PROMPTS.md §Templates`.

---

## Current state

- **Active phase:** Phase 7 — PDP & Search _(awaiting plan)_
- **Status:** Phase 6 complete; Phase 7 plan due before any Phase 7 code.
- **Last session:** 2026-05-04
- **Sub-phases done:** Phase 0–5 (master plan / foundation / design system / typed API client / i18n / auth + account); Phase 6A–6F (catalog browse). Phase 6 ships the storefront chrome (Header / Footer / MobileMenu) + homepage RSC (Hero / symptom grid / featured categories / TrustStrip) + categories index + category detail with grid folded in (Q2) + symptoms index + symptom landing + about page + cart placeholder + URL-driven Pagination + SortSelect + ProductCard (default variant) + ProductImage wrapper. 41 new i18n keys (101 × 3). 16 backend asks logged as OQ-17–OQ-22 across two batches (Phase 6 plan-derived + smoke-derived). All Phase 6 gates green; v0.6.0 tagged.
- **Next session should:** read `FRONTEND_CLAUDE_CODE_PROMPTS.md §Phase 7`, re-read `DESIGN_BLUEPRINT §12.6 (PDP)`, `§15 (trust signals)`, `§8.3 (product photography)`, `FRONTEND_BLUEPRINT §10 (data fetching)` + `§16 (image handling)`, `PRODUCT_BLUEPRINT §F-CAT-003 (PDP)` + `§F-CAT-008 (search)`. Fetch backend `app/api/v1/products.py`, `app/api/v1/search.py`, `app/domain/catalog/storefront_schemas.py` (StorefrontProductDetail, SearchResultPage, SuggestResponse), `app/domain/catalog/search.py`. Then post a Phase 7 plan covering: PDP at `/[locale]/products/[slug]` (RSC, generateMetadata, ImageCarousel, description tabs/accordion, ActiveIngredientChip row, SubstitutesBlock with Suspense), search at `/[locale]/search` (RSC + searchParams), SearchInput + SearchSuggest (client, debounced 250ms), search empty-state + synonym chip row. Phase 7 also retargets the homepage hero CTA from `/categories` → `/search` once the search route renders properly. No code until plan is approved.

---

## Phases

- [x] Phase 0 — Spec Comprehension & Master Plan _(done 2026-05-03)_
- [x] Phase 1 — Project Foundation _(done 2026-05-03; v0.1.0)_
- [x] Phase 2 — Design System Implementation _(done 2026-05-03; v0.2.0)_
- [x] Phase 3 — API Client + Type Generation _(done 2026-05-03; v0.3.0)_
- [x] Phase 4 — i18n Foundation _(done 2026-05-03; v0.4.0)_
- [x] Phase 5 — Auth & Account _(done 2026-05-03; v0.5.0)_
- [x] Phase 6 — Catalog Browse (read-only) _(done 2026-05-04; v0.6.0)_
- [ ] Phase 7 — PDP & Search _(active — plan pending)_
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

### After Phase 6 — catalog browse live

> **Backend prerequisites (per the Phase 5 recipe + a one-time seed):**
>
> ```bash
> # Already done in Phase 5: docker-up + migrate + dev. If starting fresh:
> brew services stop mysql 2>/dev/null
> cd ../pharmacy_backend && make docker-up && make migrate
>
> # Phase 6 needs catalog data. The make-target points at a non-existent
> # module (OQ-19) so invoke the seed scripts directly with the
> # mapper-preload workarounds (OQ-20):
> uv run python -c "
> import app.domain.identity.models  # noqa: F401  -- preload AdminUser
> import asyncio
> from dev.fixtures.catalog.seed import main
> asyncio.run(main())
> "
> uv run python -c "
> import app.domain.identity.models  # noqa: F401
> import app.domain.orders.models     # noqa: F401  -- preload orders FK
> import asyncio
> from dev.fixtures.inventory.seed import main
> asyncio.run(main())
> "
>
> make dev 2>&1 | tee /tmp/backend.log
> ```
>
> Seeded catalog: 7 manufacturers, 6 categories (4 root + 2 children of Vitamins), 5 symptoms, 5 ingredients, 5 products, 2 branches, 7 batches. All translations in RU/KY/EN (some KY/EN gaps acknowledged per Q-9 pre-launch review). All 5 products are currently `is_in_stock=false` until inventory levels get populated (post-MVP via admin Phase A1+).

```bash
# Manual smoke (storefront on :3000, backend on :8000, seeded as above):
pnpm dev

# /ru → renders Hero + symptom grid (5 tiles in Cyrillic) + featured
#   categories grid (4 root cats) + TrustStrip + Footer
# Click hero CTA "Найти лекарства" → lands on /ru/categories
# Click a category card → /ru/categories/<slug> with breadcrumb +
#   description + EmptyState (in_stock_only=true filters everything out)
# /ru/categories/vitamins → also shows sub-cats (Витамин C, Поливитамины)
# /ru/symptoms → 5 symptom tiles
# Click a tile → /ru/symptoms/<slug> with name + EmptyState (no
#   product-symptom links in current seed)
# /ru/about → 2 branch cards (Аптека Асанбай / Центральная), license,
#   trust strip
# /ru/cart → friendly EmptyState (Phase 8 wires real cart)

# Locale verification (R-D):
# /ky → Kyrgyz where seed has KY translations (Витаминдер / Баш ооруу /
#   Жогорку температура / Сууктоо / etc.); RU fallback for the symptoms
#   missing KY translations in the seed (muscle-pain, heartburn) per
#   backend _pick_translation design (PRODUCT §13.1 RU canonical)
# /en → English fully

# E2E (backend up + seeded):
pnpm e2e --project chromium --grep @requires-backend tests/e2e/catalog-flow.spec.ts tests/e2e/symptom-flow.spec.ts
# → 10 passed (5 catalog + 5 symptom flow tests covering chrome render,
#    category navigation, symptom navigation, KY locale verification,
#    about-page branch rendering, empty-state path)

# CI gate (no backend):
pnpm e2e --project chromium --grep-invert @requires-backend
# → 13 passed, 1 skipped (Phase 4 + Phase 5 + Phase 6 specs that don't
#    need a backend; the `@requires-backend` Phase 5 + Phase 6 specs are
#    filtered out)
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
- [ ] **OQ-17 verification (deferred from Phase 6)** — confirm `Accept-Language: ky` returns Kyrgyz product names from `GET /api/v1/symptoms/{slug}/products`. Not feasible at Phase 6 close because the seed has empty `symptoms=[]` arrays on every product, so the endpoint returns `{items: []}` for all locales (data-shaped empty, not language-shaped). Re-run once admin Phase A1+ has populated product-symptom links with realistic seeded data; if the response still comes back in Russian for `?lang=ky` / `Accept-Language: ky`, escalate as a real backend bug before launch.
- [ ] **OQ-22 audit (deferred from Phase 6)** — backend audit of the `cache_get_or_set` race that caused `GET /api/v1/categories` to return `[]` despite 6 active rows during Phase 6 6B smoke. Self-resolved after a fresh dev start (likely an empty-array value cached for `CATEGORY_TREE_TTL=3600`); recommend confirming no recurrence + adding a "skip caching empty results" guard to the loader before launch. If the bug surfaces again in any later phase smoke, escalate.

---

## Cross-cutting reminders

- **Sacred invariants (CLAUDE.md):** no marketing scarcity; no symptom-to-prescription advice; no fake "best price" / "100% authentic" claims; customer support phone always one tap away; order numbers in `--text-mono` with `PH-` prefix; `Idempotency-Key` on every `POST /checkout/place`; refresh token NEVER in localStorage; no PII logged client-side; `/specs/*` read-only during build phases; tokens only — no raw hex / raw font-size / raw spacing.
- **Brand discipline.** Brand name lives only in `lib/brand.ts` (TS) + `messages/<lang>.json brand.{name,tagline}` (UI) + `public/brand/logo-*.svg` (visual). Code review gate: no literal "Nookat" outside those files.
- **Verification gate before "complete":** `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm e2e` — all green or the phase isn't done. "This should work" is forbidden.
