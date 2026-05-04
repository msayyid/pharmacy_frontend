# Build Progress

> Persistent state between sessions. Updated at every phase boundary. If you can't tell what's next from this file, it's wrong — fix it first. Format per `FRONTEND_CLAUDE_CODE_PROMPTS.md §Templates`.

---

## Current state

- **Active phase:** Phase 10 — Order History & Detail _(complete; tagged v0.10.0)_
- **Status:** Phase 10 complete and tagged v0.10.0. Customer-facing order list at `/[locale]/orders` (page-based pagination, hard-gated by middleware), order detail extension layered onto the 9E confirmation page (StatusTimeline + DeliveryBlock + OrderItemsBlock + cancel + reorder), Q-12 polling wired (60s while non-terminal, off in background, off on terminal).
- **Last session:** 2026-05-04
- **Sub-phases done:** Phase 0–9 + Phase 10A–10F. Phase 10A: `lib/orders/{lifecycle,queries,mutations}.ts` + `<OrderNumber>` (sacred-invariant #5 centralization). 10B: `<OrderListRow>` + `<StatusPip>` + `<OrderListPagination>` + `/[locale]/orders/page.tsx`. 10C: `<StatusTimeline>` + `<OrderItemsBlock>` + `<DeliveryBlock>` + detail page extension (9E success-framing fallback retained per D9). 10D: `<CancelOrderDialog>` (shadcn AlertDialog; hard-prohibition #16) + `useCancelOrder` mutation + setQueryData splice for instant timeline update. 10E: `<ReorderButton>` + `useReorder` with locked invalidate-then-push sequence (Phase 8 D12 R-C echo) + classifyReorder helper for full / partial / empty toast outcomes. 10F: full verification gate green; v0.10.0 tagged + pushed. **49 new i18n keys × 3 locales (161 → 210 parity).** **OP-13 grep gate held end-to-end** — zero catch blocks across `lib/orders/*` (matches Phase 9 strictness). **Snapshot-immutability invariant verified** — `OrderItemsBlock` renders `product_name_snapshot` / `unit_price` verbatim, zero PDP refetch (test-locked).
- **Next session should:** read `FRONTEND_CLAUDE_CODE_PROMPTS.md §Phase 11`, re-read `FRONTEND_BLUEPRINT §17 (perf)` + `DESIGN_BLUEPRINT §16 (a11y)` + `PRODUCT_BLUEPRINT §22.7 (analytics)`. Phase 11 hardening covers: SEO (`generateMetadata` for every route + `robots.txt` + `sitemap.xml` + canonical / hreflang sweep), perf (Lighthouse ≥90 on / and PDPs; Web Vitals), a11y (axe-core sweep + keyboard nav audit), Sentry SDK wiring (replaces the `lib/observability/trace.ts` stub), ImageCarousel polish if needed. No code until plan is approved.

---

## Phases

- [x] Phase 0 — Spec Comprehension & Master Plan _(done 2026-05-03)_
- [x] Phase 1 — Project Foundation _(done 2026-05-03; v0.1.0)_
- [x] Phase 2 — Design System Implementation _(done 2026-05-03; v0.2.0)_
- [x] Phase 3 — API Client + Type Generation _(done 2026-05-03; v0.3.0)_
- [x] Phase 4 — i18n Foundation _(done 2026-05-03; v0.4.0)_
- [x] Phase 5 — Auth & Account _(done 2026-05-03; v0.5.0)_
- [x] Phase 6 — Catalog Browse (read-only) _(done 2026-05-04; v0.6.0)_
- [x] Phase 7 — PDP & Search _(done 2026-05-04; v0.7.0)_
- [x] Phase 8 — Cart _(done 2026-05-04; v0.8.0)_
- [x] Phase 9 — Checkout & Order Placement _(done 2026-05-04; v0.9.0)_
- [x] Phase 10 — Order History & Detail _(done 2026-05-04; v0.10.0)_
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

### After Phase 8 — cart live

> **Backend prereqs unchanged from Phase 6/7 (docker-up + migrate + seed).**
>
> **Phase 8 smoke fixture (REQUIRED for in-stock add-to-cart).** Backend's
> `BranchIdDep` hardcodes `branch_id=1` (Q-1 single-branch) but the seed
> inventory lives at `branch_id=3`, so by default ALL products read OOS
> via the catalog endpoints and the AddToCartButton stays disabled. The
> smoke fixture inserts a `branches` row with id=1 cloned from id=3 and
> mirrors the `branch_products` rows. **Apply once per fresh checkout;
> document any divergence as OQ-25+.**
>
> ```bash
> # Apply the Phase 8 smoke fixture:
> docker exec pharmacy_backend-mysql-1 mysql --default-character-set=utf8mb4 -uroot -proot pharmacy -e "
> INSERT INTO branches (id, code, name, address, city, phone, latitude, longitude, timezone, opens_at, closes_at, is_active, created_at, updated_at)
> SELECT 1, 'BISHKEK_DEFAULT', name, address, city, phone, latitude, longitude, timezone, opens_at, closes_at, 1, NOW(6), NOW(6)
> FROM branches WHERE id = 3;
>
> INSERT INTO branch_products (branch_id, product_id, price, compare_at_price, currency, is_available, total_quantity, reserved_quantity, low_stock_threshold, updated_at)
> SELECT 1, product_id, price, compare_at_price, currency, is_available, total_quantity, reserved_quantity, low_stock_threshold, NOW(6)
> FROM branch_products WHERE branch_id = 3;
> "
>
> # Restart Redis to clear cached empty-arrays:
> docker exec pharmacy_backend-redis-1 redis-cli FLUSHALL
>
> # Verify the catalog now reports in-stock:
> curl -s -H "Accept-Language: ru" "http://localhost:8000/api/v1/categories/pain-relief/products?in_stock_only=true" | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])"
> # → 3
>
> # Revert when done:
> docker exec pharmacy_backend-mysql-1 mysql --default-character-set=utf8mb4 -uroot -proot pharmacy -e "
> DELETE FROM branch_products WHERE branch_id = 1;
> DELETE FROM branches WHERE id = 1;
> "
> ```
>
> **OQ-24:** PDP endpoint reports is_in_stock=false even after the fixture
> (different backend code path from catalog list). Cart-flow smoke uses
> the category-page add-to-cart path, not PDP. Logged in OPEN_QUESTIONS.

```bash
# Manual smoke (storefront on :3000, backend with fixture applied):
pnpm dev

# Add-to-cart happy path:
# /ru/categories/pain-relief → AddToCartButton enabled on 3 products
# Click "Добавить в корзину" → Sonner toast appears top-right
# Header cart badge shows "1"
# Click cart icon (desktop): drawer slides in with the line
# Click cart icon (mobile): navigates to /ru/cart
# QuantityStepper +/- in /cart updates qty optimistically with debounced PATCH
# Mash + button 5 times rapidly → ONE PATCH fires after 200ms (verify in
#   Network tab; see DECISION_LOG D4)
# Remove (trash icon) → line disappears, EmptyState renders
# /ru/cart with empty cart → "Перейти к покупкам" CTA → /ru/categories

# Cart-merge handoff (locked sequence per DECISION_LOG D12):
# Add an in-stock item as guest → /ru/auth/otp → enter phone
# OTP code: tail -n 50 /tmp/backend.log | grep -E 'code[":= ]+[0-9]{6}'
# Verify → /ru/account; immediately navigate to /ru/cart
# The previously-added item is preserved (merge ran in the verify handler)
# R-C verification: NO flash of empty-state on /cart load

# E2E (backend up + smoke fixture applied):
pnpm e2e --project chromium --grep @requires-backend tests/e2e/{cart-flow,cart-merge}.spec.ts

# CI gate (no backend):
pnpm e2e --project chromium --grep-invert @requires-backend
```

### After Phase 9 — full J-01 (first-time symptom shopper)

> **Backend prereqs unchanged from Phase 8.** Same smoke fixture (in-stock at branch_id=1) required.

```bash
# Fresh user, no auth, no cart
# /ru → Symptom tile → /ru/symptoms/headache → product card → /ru/products/{slug}
# Add to cart; cart icon updates; /ru/cart shows line
# Click "Оформить заказ" → middleware redirects to /ru/auth/otp?return=/ru/checkout
# Enter phone → OTP code from backend log → verify
# Locked merge sequence runs: cart preserved across redirect to /ru/checkout
# /ru/checkout populates: delivery selected (default address), recipient pre-filled
#   from /me, sticky review on right shows totals from POST /quote
# Edit address inline + change qty in /cart + come back → quote refetches; review updates
# Place order → POST /place fires with Idempotency-Key header
#   (verify in DevTools Network: Idempotency-Key: <uuid>)
# Click Place again BEFORE the redirect lands → SAME UUID resent;
#   backend dedups via Redis (24h TTL); response identical to first
# Redirected to /ru/orders/PH-<num>; order number rendered in monospace;
#   order summary populated from GET /me/orders/{order_number}
# Backend log shows place_order; database has order row with idempotency_keys
#   row pinned to the same UUID

# Conflict-resolution dry-run (manual):
# Have two browser tabs on /ru/checkout for the same cart.
# In tab A: place order → 201 OK.
# In tab B: place order → 409 checkout_conflict (cart now empty).
# ConflictBanner surfaces with Edit-cart CTA.

# Tests + gate:
pnpm test --run                     # 24 files / 179 tests passing + 1 skipped
pnpm e2e --project chromium --grep-invert @requires-backend   # CI gate (no backend)
```

### After Phase 10 — order history + detail (J-02 partial)

> **Backend prereqs unchanged from Phase 9.** Same Phase 8 smoke fixture (in-stock at branch_id=1) required to place a real order during the smoke. After Phase 9 you have at least one order on the user; Phase 10 verifies it surfaces correctly.

```bash
# Manual smoke (storefront on :3000, backend with fixture applied):
pnpm dev

# Place at least one order via the J-01 flow first (Phase 9 smoke).
# Auth state: a user logged in via OTP with a placed order.

# /ru/orders → renders the list with at least one row
#   - Order number in `--text-mono` with PH- prefix (sacred-invariant #5)
#   - Status pip with localized label
#   - Total in tabular-nums sap-formatted (1 250 сом)
#   - placed_at date in DD.MM.YYYY (ru/ky) / DD/MM/YYYY (en)
#   - Whole row is a Link to /ru/orders/<order_number>
# Click the row → /ru/orders/PH-<num>
#   - Header with confirmation icon + monospace order number + StatusPip
#   - <StatusTimeline> renders the spine: pending → confirmed → preparing
#     → out_for_delivery → delivered (delivery method) OR
#     pending → confirmed → preparing → ready_for_pickup → delivered (pickup)
#   - <DeliveryBlock> renders recipient name + +996-formatted phone +
#     joined address parts (delivery only) + customer notes
#   - <OrderItemsBlock> renders snapshot lines + totals (subtotal +
#     delivery_fee + total)
#   - <CancelOrderButton> visible iff status ∈ {pending, confirmed}
#   - <ReorderButton> visible iff status ∈ {delivered, cancelled, refunded}
# Click cancel → AlertDialog opens (NOT confirm() — sacred-invariant #16
#   verified by inspecting the trigger element in DevTools)
#   - Confirm fires POST /me/orders/<num>/cancel
#   - Timeline updates instantly (cache splice via setQueryData)
#   - Order list invalidated; on next visit shows cancelled
# Click reorder on a delivered order → POST /me/orders/<num>/reorder
#   - Toast surface: full / partial / empty per response.lines[]
#   - Cart query invalidates BEFORE router.push — destination /ru/cart
#     renders the merged cart immediately on first paint, no flash
# Polling cadence: leave a non-terminal order detail page open for 60s
#   - Network tab shows GET /me/orders/<num> firing every 60s while non-terminal
#   - Switch to a different tab → polling pauses (refetchIntervalInBackground=false)
#   - Order reaches delivered → polling stops

# Empty state path:
# Use a fresh user with no orders → /ru/orders → friendly EmptyState
#   with "Перейти к покупкам" → /ru/categories

# E2E (CI gate, no backend):
pnpm e2e --project chromium --grep-invert @requires-backend
# → 13 passed, 1 skipped (account-gate covers /orders hard-gate; the
#   redirect→/auth/otp regression net protects Phase 5 D4 across phases)

# Tests + gate:
pnpm test --run                # 34 files / 255 tests + 1 skipped
pnpm typecheck                 # 0
pnpm lint                      # 0
pnpm i18n:check                # 210 × 3 parity
pnpm build:ci                  # 0
docker build -t nookat-storefront:phase10 .
docker run -d --rm -p 3000:3000 --name nookat-test nookat-storefront:phase10
sleep 5 && curl -s localhost:3000/api/health  # → {"status":"ok","version":"0.1.0"}
docker stop nookat-test
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

#### Backend blockers (must reconcile before any FE launch)

- [ ] **OQ-24 — PDP `is_in_stock` asymmetry.** Backend's `GET /api/v1/products/{slug}` reads `is_in_stock=false` even when `GET /api/v1/categories/{slug}/products` reads the same product as in-stock for the same branch context. This is a conversion-killer: customer browses category → sees in-stock → clicks PDP → sees OOS → leaves. Different code paths in `app/domain/catalog/storefront.py`. **Phase 12 launch CANNOT ship until reconciled.** Once fixed, flip the regression marker in `tests/e2e/cart-flow.spec.ts` line 105 from `expect(cta).toBeDisabled()` to assert the happy path on PDP.
- [ ] **Backend Q13 (Nikita SMS) closed** → real OTP works in production. Without this, the auth flow can't run against real customers (currently uses fake SMS adapter that logs codes to stdout).

#### Backend asks (recommended audits before launch — not strict blockers)

- [ ] **OQ-17 verification.** Confirm `Accept-Language: ky` returns Kyrgyz product names from `GET /api/v1/symptoms/{slug}/products`. Not feasible at Phase 6 close because the seed has empty `symptoms=[]` arrays on every product, so the endpoint returns `{items: []}` for all locales (data-shaped empty, not language-shaped). Re-run once admin Phase A1+ has populated product-symptom links with realistic seeded data; if the response still comes back in Russian for `?lang=ky` / `Accept-Language: ky`, escalate as a real backend bug before launch.
- [ ] **OQ-22 audit.** Backend audit of the `cache_get_or_set` race that caused `GET /api/v1/categories` to return `[]` despite 6 active rows during Phase 6 6B smoke. Self-resolved after a fresh dev start (likely an empty-array value cached for `CATEGORY_TREE_TTL=3600`); recommend confirming no recurrence + adding a "skip caching empty results" guard to the loader before launch. If the bug surfaces again in any later phase smoke, escalate.
- [ ] **OQ-23 — `requires_cold_chain` on `CartItemRead`.** Phase 8 deferred cold-chain banner to checkout (Phase 9). If Phase 9's checkout-side cold-chain flow becomes friction at smoke, escalate the backend ask. Otherwise post-MVP.

#### FE pre-launch (content + ops + curation)

- [ ] **KY translations reviewed by a local Kyrgyz pharmacist.** Coherent + complete is OK at MVP; polished is the pre-launch bar.
- [ ] **EN translations human-reviewed.** Machine translation is acceptable as a starting point; production gate is human review.
- [ ] **Real Nookat logo** swapped in (4-5 file edits per DESIGN §20). Owner provides before Phase 12.
- [ ] **Real support phone** replaces `+996 XXX XX XX XX` placeholder in `lib/brand.ts`.
- [ ] **Real license number** replaces `№XXXXX` placeholder.
- [ ] **Real Nookat physical address** in `lib/brand.ts`.
- [ ] Legal pages (Terms / Privacy / Delivery / Returns) reviewed by counsel; placeholder text replaced.
- [ ] CORS origins on backend include production storefront + admin domains.
- [ ] Sentry DSN configured (production project).

---

## Cross-cutting reminders

- **Sacred invariants (CLAUDE.md):** no marketing scarcity; no symptom-to-prescription advice; no fake "best price" / "100% authentic" claims; customer support phone always one tap away; order numbers in `--text-mono` with `PH-` prefix; `Idempotency-Key` on every `POST /checkout/place`; refresh token NEVER in localStorage; no PII logged client-side; `/specs/*` read-only during build phases; tokens only — no raw hex / raw font-size / raw spacing.
- **Brand discipline.** Brand name lives only in `lib/brand.ts` (TS) + `messages/<lang>.json brand.{name,tagline}` (UI) + `public/brand/logo-*.svg` (visual). Code review gate: no literal "Nookat" outside those files.
- **Verification gate before "complete":** `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm e2e` — all green or the phase isn't done. "This should work" is forbidden.
