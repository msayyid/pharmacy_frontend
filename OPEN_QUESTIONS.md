# Open Questions

> Unresolved ambiguities + proposed defaults. Closed questions stay in the **Resolved** archive at the bottom for traceability.
>
> Format per `FRONTEND_CLAUDE_CODE_PROMPTS.md §Templates`. Append-only for the Resolved section; Open questions move down to Resolved when answered.

---

## Open

### OQ-16 — Backend should expose `POST /api/v1/cart/merge`
**Raised:** 2026-05-03 (Phase 0)
**Question.** The backend's `CartService.merge_guest_into_user` exists at `app/domain/orders/cart_service.py:158` but no route invokes it. The cart router's docstring is aspirational. Without a merge endpoint, a guest who builds a cart, hits the auth wall at place-order, and verifies OTP loses the guest cart's contents (`get_cart_owner` returns `(user, None)` and ignores the cookie when a Bearer is present).
**Proposed default (FE-side workaround for MVP).** After successful OTP-verify, the FE reads the guest cart's items from the in-memory TanStack Query cache (already populated from the pre-login `GET /cart`), then re-POSTs each item to `/api/v1/cart/items` in sequence using the new Bearer. Out-of-stock failures surface inline; partial success is acceptable. **Loses price snapshots; preserves intent.** Implementation lands in Phase 5 (auth) co-located with the OTP-verify success handler. Documented in `DECISION_LOG.md` 2026-05-03 entry.
**Why it matters.** It is on the J-01 conversion path. The right fix is backend-side: a single transactional merge that preserves snapshots, cap-applies `max_per_order`, and dedupes against existing user-cart lines. We will request `POST /api/v1/cart/merge` (or wiring `merge_guest_into_user` into OTP-verify) from the backend team after MVP launch unless we find evidence that the workaround is failing in production telemetry.
**Owner.** Frontend (workaround); Backend team (proper fix).
**Status.** Open — backend ask is post-MVP unless escalated.
**Decision.** _(open — proper fix deferred to backend; FE workaround approved for MVP)_

### OQ-17 — Symptom-products endpoint missing `lang` and `branch_id` query params
**Raised:** 2026-05-04 (Phase 6)
**Question.** `GET /api/v1/categories/{slug}/products` accepts both `lang` and `branch_id` query params. The parallel `GET /api/v1/symptoms/{slug}/products` accepts neither — locale resolves through `Accept-Language` only, and branch scope falls back to whatever default the route uses (likely the hardcoded `branch_id=1` per Q-6). Asymmetry surfaces as a smoke risk: KY/EN symptom pages must rely on the backend honoring `Accept-Language`; if the symptom-products resolver shortcuts to RU/default, KY users see Russian product names on the symptom landing.
**Proposed default (Phase 6 ship).** Accept the asymmetry. The FE's `lib/api/server.ts` already sets `Accept-Language` from the inbound request on every server-side call, so the canonical channel is in place. Phase 6 close intends to verify `/ky/symptoms/<slug>` actually returns Kyrgyz product names (R-D verification gate). Symptoms going branch-aware is post-MVP; the single-branch ground truth (Q-1) means `branch_id` is moot at MVP.
**Verification status (2026-05-04).** **Cannot verify with current seed.** The 5 seeded products have empty `symptoms=[]` arrays in `dev/fixtures/catalog/products.json`, so `/api/v1/symptoms/<any-slug>/products` correctly returns `{items: [], total: 0}` for all locales — the empty response is data-shaped, not language-shaped. Accept-Language honoring on this endpoint cannot be confirmed until the seed adds at least one product-symptom link. R-D verification carries forward to Phase 8 close (when admin can seed at scale) or whenever backend fixture extends to include symptom tags.
**Owner.** Backend team (post-MVP if/when symptoms go multi-branch); Frontend (verification deferred).
**Status.** Open — accepted asymmetry; verification deferred until product-symptom links are seeded.
**Decision.** _(open — symmetry restoration deferred; Accept-Language verification re-runs at Phase 8 close)_

### OQ-18 — `StorefrontSymptomDetail` schema unused; symptom landing has no description / synonyms
**Raised:** 2026-05-04 (Phase 6)
**Question.** Backend defines `StorefrontSymptomDetail` (`StorefrontSymptom` + `description` + `synonyms[]`) but no route serves it. The closest the storefront has is `GET /api/v1/symptoms/{slug}/products` which returns the product list, not the symptom detail object. Frontend symptom-landing pages can show name + icon + product grid only; no hero copy, no synonyms.
**Proposed default (Phase 6 ship).** Do not block — render symptom landing as `StorefrontSymptom` only. PRODUCT spec doesn't mandate a description block on symptom landings; SEO-rich symptom pages are a Phase-11+ enhancement. If/when we want richer landings, request `GET /api/v1/symptoms/{slug}` returning the existing `StorefrontSymptomDetail` shape (one route, zero schema work).
**Owner.** Backend team (post-MVP).
**Status.** Open — accepted gap, log only.
**Decision.** _(open — richer symptom landings deferred to Phase 11+)_

### Backend bugs surfaced during Phase 6 smoke (2026-05-04)

The next four entries (OQ-19 through OQ-22) were all surfaced during sub-phase 6B's first attempt at a populated-data smoke against a freshly migrated `pharmacy` database. None block Phase 6 ship — the FE has working incantations / acceptance for each. Grouped here for batch hand-off to the backend team rather than scattered.

### OQ-19 — `make seed` Makefile target invokes a module that does not exist
**Raised:** 2026-05-04 (Phase 6)
**Question.** `pharmacy_backend/Makefile`'s `seed` target runs `uv run python -m dev.fixtures.seed`, but there is no `dev/fixtures/seed.py`. The actual seed scripts are `dev/fixtures/catalog/seed.py` and `dev/fixtures/inventory/seed.py`. `make seed` is broken on a fresh checkout.
**Proposed default (no FE workaround needed).** Frontend smoke recipes invoke the seeds directly via `uv run python -m dev.fixtures.catalog.seed` and `uv run python -m dev.fixtures.inventory.seed` (with the workaround in OQ-20 below). Backend should either add a top-level `dev/fixtures/seed.py` that imports + runs both, or fix the Makefile target to call both submodules.
**Owner.** Backend team.
**Status.** Open — backend ask, low effort, low priority.
**Decision.** _(open — FE works around via direct module invocation)_

### OQ-20 — Seed scripts crash without manual model preloading (mapper relationship resolution)
**Raised:** 2026-05-04 (Phase 6)
**Question.** Running `python -m dev.fixtures.catalog.seed` raises `sqlalchemy.exc.InvalidRequestError: When initializing mapper Mapper[StockMovement(stock_movements)], expression 'AdminUser' failed to locate a name`. Inventory seed similarly crashes on `NoReferencedTableError: Foreign key associated with column 'stock_movements.order_id' could not find table 'orders'`. Both fail because the seed's import chain doesn't pull in `app.domain.identity.models` (catalog seed) or `app.domain.orders.models` (inventory seed) before SQLAlchemy resolves cross-package relationships.
**Proposed default (FE workaround — already used in Phase 6 smoke).** Wrap each seed invocation with explicit pre-imports:
```bash
uv run python -c "
import app.domain.identity.models  # noqa: F401
import app.domain.orders.models     # noqa: F401  -- only for inventory seed
import asyncio
from dev.fixtures.<X>.seed import main
asyncio.run(main())
"
```
Backend fix: add the missing imports at the top of each seed module so `python -m dev.fixtures.<X>.seed` works as documented. One-line edits.
**Owner.** Backend team.
**Status.** Open — backend ask, low effort, low priority. FE has working incantation.
**Decision.** _(open — FE works around via wrapper)_

### OQ-21 — Diagnostic-only: `docker exec mysql` defaults to `latin1` and prints Cyrillic as `???` (NOT a data bug, no action needed)
**Raised:** 2026-05-04 (Phase 6)
**Severity:** Diagnostic-only. False alarm.
**Question (resolved at raise-time).** During Phase 6 smoke we observed `???????` for Cyrillic translation rows when querying via `docker exec pharmacy_backend-mysql-1 mysql ...`. **The data on disk is correct UTF-8** — verified by `HEX(name)` showing valid UTF-8 byte sequences (e.g., `D092 D0B8 D182 D0B0 D0BC D0B8 D0BD D18B` = "Витамины") and by re-running with `--default-character-set=utf8mb4` showing readable Russian. The MySQL CLI inside the container negotiates `character_set_client/connection/results = latin1` by default, which displays UTF-8 bytes as latin1 mojibake. The `asyncmy` driver the backend uses negotiates `utf8mb4` correctly, so the API returns proper Cyrillic when the API actually returns rows.
**Action.** None required. Operator footnote: pass `--default-character-set=utf8mb4` when shelling into the MySQL container if Cyrillic readability matters to the diagnostic. Optional backend QoL: set the MySQL container's `[client]` section to default to `utf8mb4` so docker-exec-shells don't need the flag.
**Owner.** None — closed-on-raise.
**Status.** Open (logged for traceability) — no action needed.
**Decision.** No-op. Data integrity is intact.

### OQ-22 — `GET /api/v1/categories` intermittently returns `[]` despite 6 active rows in the categories table
**Raised:** 2026-05-04 (Phase 6)
**Severity:** Medium — reproduced once during Phase 6 sub-phase 6B smoke, then resolved itself without intervention. Worth a backend audit before launch because the failure mode (empty homepage category grid) is high-visibility on the primary discoverability surface.
**Reproduction window (2026-05-04, ~21:40-22:30 UTC).** API returned `[]` from initial run. Survived: `FLUSHALL` of Redis, fresh dev-server restart, uvicorn restart by the operator. Symptoms + branches endpoints worked correctly throughout the same window with the same DB connection. Direct ORM queries through a standalone `uv run python -m ...` script returned all 6 rows during the same window.
**Self-resolution (2026-05-04, ~22:35 UTC).** A subsequent dev-server restart (after killing the FE dev process and clearing `.next/`) suddenly began receiving real category data: 4 root categories with full Cyrillic names + 2 sub-categories under Vitamins. No backend fix was applied. Possible causes: (a) a stale empty-array value in Redis with a long TTL that finally expired, (b) a race in `cache_get_or_set` where one early request stored an empty result before the seed transaction was visible, then served it for the cached duration, (c) some other cache or pool warmup issue that resolves naturally over time.
**Question.** `GET /api/v1/categories` returns `[]` despite the `pharmacy.categories` table having 6 active rows (`is_active=1`, `deleted_at IS NULL`). Symptoms (`/api/v1/symptoms`) and branches (`/api/v1/branches`) endpoints work correctly with the same DB connection and same backend process — same `asyncmy` driver, same DSN. The bug is specific to the categories query path. Restarting uvicorn does not fix it (initial stale-pool theory rejected). FastAPI returns 200 OK with an empty array body.
**Diagnostic findings (2026-05-04).** The visible code path looks correct end-to-end:
- Route `app/api/v1/categories.py:30` calls `service.get_categories_tree(language_code=lang)` — fine.
- Service `app/domain/catalog/storefront.py:74` calls `self.categories.list_active_tree()` then `_assemble_tree(cats, language_code)` — fine.
- Repository `app/domain/catalog/repositories.py:243` queries `select(Category).options(selectinload(Category.translations)).where(Category.deleted_at.is_(None), Category.is_active.is_(True))` — direct ORM execution of this exact query (same DSN, same settings) returns 6 rows in our diagnostic.
- `_assemble_tree` falls back to slug if translation lookup fails (`name = _pick_translation(...) or c.slug`), so even degenerate translation data would yield 6 nodes — the empty array can only happen if `list_active_tree()` itself returns 0 rows.
- `cache_get_or_set` wrapper is straightforward (Redis GET → loader → SET); we did `FLUSHALL` before the curl that returned `[]`, so cache is not the cause; it can only be storing what `loader` returned, which means `list_active_tree()` returned 0.

**Diagnostic findings during the failure window.** The visible code path looked correct end-to-end:
- Route `app/api/v1/categories.py:30` → `service.get_categories_tree(language_code=lang)` — fine.
- Service `app/domain/catalog/storefront.py:74` → `self.categories.list_active_tree()` then `_assemble_tree(cats, language_code)` — fine.
- Repository `app/domain/catalog/repositories.py:243` → `select(Category).options(selectinload(Category.translations)).where(Category.deleted_at.is_(None), Category.is_active.is_(True))` — direct ORM execution of this exact query (same DSN, same settings) returned 6 rows in our diagnostic.
- `_assemble_tree` falls back to slug if translation lookup fails (`name = _pick_translation(...) or c.slug`), so even degenerate translation data would yield 6 nodes — empty array implies `list_active_tree()` itself returned 0.
- `cache_get_or_set` wrapper is straightforward (Redis GET → loader → SET); we ran `FLUSHALL` between curls during the failure window, so cache wasn't holding the value across our explicit flushes.

**Suspected root cause (still — bug isn't fully understood).** Most likely a `cache_get_or_set` race: one early request, executing during or before the seed transaction's visibility, ran the loader, got 0 rows, and cached `[]` for `CATEGORY_TREE_TTL=3600`. Operators restarting Redis or letting the TTL expire would resolve it — which matches the self-resolution timing. If true, the fix is to either (a) skip caching empty results (treat `[]` as a transient signal rather than a value to cache), (b) shorten the empty-result TTL, or (c) clear the categories cache key as part of `make migrate` / `make seed`.
**Proposed default (no FE work).** Phase 6 ships against current state — the homepage handles both empty and populated category trees correctly. If the bug returns at launch, FE renders an empty featured-categories section gracefully (Hero + symptom grid + trust strip + footer remain), and the impact is "homepage looks sparser" rather than "homepage broken."
**Owner.** Backend team — medium priority, recommended audit before launch, but not a blocker.
**Status.** Open — backend audit recommended; not reproducing currently.
**Decision.** _(open — backend follow-up recommended; FE renders correctly in both states)_

---

## Resolved

### Q-1 — Branch picker UX
**Raised:** 2026-05-03 (Phase 0)
**Question.** Backend hardcodes `branch_id = 1` for storefront. Does the storefront expose any branch UI affordance at MVP, or stay single-branch with footer/About note?
**Decision (2026-05-03).** **Single branch.** Show "Аптека в Ноокате" in footer + About; do not plumb an `X-Branch-Id` header today. Pre-stub a `BranchContext` so a future picker is a one-component change. Phase-2 picker is a backlog item.
**Reference.** `MASTER_PLAN.md §6 Q-1`; `BranchIdDep` at backend `app/api/deps.py:145`.

### Q-2 — Card payment + non-COD methods at MVP
**Raised:** 2026-05-03 (Phase 0)
**Question.** Backend supports `cash_on_delivery | card_online | mbank | elsom | odengi | balance_kg | bank_transfer`. Which payment methods does the storefront expose at MVP?
**Decision (2026-05-03).** **COD only at MVP.** Default `payment_method = cash_on_delivery` for both delivery and pickup orders. Hide the card-online radio AND every other non-COD method. Card lands in Phase 1.5 when backend's Q14 (Freedom Pay) closes; mbank/elsom/odengi/balance_kg/bank_transfer evaluated on a per-method basis post-launch. When card lands: `window.location.assign(payment_redirect_url)`; no iframe, no new tab.
**Reference.** `MASTER_PLAN.md §6 Q-2`; PRODUCT §23.1 (card is Phase 1.5).

### Q-3 — PWA scope at MVP
**Raised:** 2026-05-03 (Phase 0)
**Question.** Manifest + favicons + theme-color only, or full PWA with service worker + offline mode?
**Decision (2026-05-03).** **Manifest + favicons + theme-color only.** No service worker. Add-to-home-screen on Android works; offline mode is non-trivial and deferred to Phase-2 backlog.

### Q-4 — Refresh-token transport
**Raised:** 2026-05-03 (Phase 0)
**Question.** Backend's `POST /auth/refresh` accepts the refresh token in the JSON body, not in a cookie. Where does the FE store it client-side?
**Decision (2026-05-03).** Per `FRONTEND_BLUEPRINT §8.1`: Next.js Route Handler (`/api/auth/set-tokens`) wraps the refresh into an **HttpOnly + Secure + SameSite=Lax cookie named `nookat_refresh`** at the FE's own origin. JS never touches the refresh token. A second route handler (`/api/auth/refresh-tokens`) reads the cookie and proxies to the backend. Access token stays in memory (Zustand). Concurrent 401s share a single in-flight refresh.
**Reference.** `MASTER_PLAN.md §6 Q-4`; FRONTEND §8.1-§8.3.

### Q-5 — Cart-merge on OTP-verify (backend gap)
**Raised:** 2026-05-03 (Phase 0)
**Question.** Backend's OTP-verify does not invoke `merge_guest_into_user`. What does the FE do when a guest with a `pharmacy_cart_session` cookie logs in?
**Decision (2026-05-03).** **FE workaround at Phase 5: sequential re-add of guest-cart items via `POST /api/v1/cart/items`.** Best-effort, loses price snapshots, preserves intent. Out-of-stock per line surfaces inline; partial success acceptable; never blocks login. Tracked separately as **OQ-16** for the backend ask. Not escalated to backend now; revisit post-MVP.
**Reference.** `MASTER_PLAN.md §6 Q-5`; `DECISION_LOG.md 2026-05-03 — Cart-merge workaround`.

### Q-6 — `X-Branch-Id` header
**Raised:** 2026-05-03 (Phase 0)
**Decision (2026-05-03).** **Don't send.** Backend ignores it (hardcoded `branch_id=1`). Define a `BRANCH_ID = 1` constant + `BranchContext` boundary; flip a flag when backend wires the dep.

### Q-7 — Dev-convenience `/auth/register` and `/auth/login`
**Raised:** 2026-05-03 (Phase 0)
**Decision (2026-05-03).** **OTP-only on the customer storefront.** Backend's email/password endpoints stay backend-only. Document in `BUILD_PROGRESS.md > Smoke recipes` for Phase 5 testing convenience (faster than OTP-log-scraping).
**Reference.** PRODUCT §F-AUTH-001.

### Q-8 — Phone-change flow
**Raised:** 2026-05-03 (Phase 0)
**Decision (2026-05-03).** **Phone is read-only at MVP.** `PATCH /me` is `extra="forbid"` on `phone`. `/account/profile` shows phone with copy: "Чтобы сменить номер, [позвоните нам]." Phase-1.5 backlog item.
**Reference.** PRODUCT §23.2.

### Q-9 — KY/EN coverage at launch
**Raised:** 2026-05-03 (Phase 0)
**Question.** What's the minimum KY/EN coverage at MVP launch?
**Decision (2026-05-03).** **All three locales fully populated.** Every user-visible string has a translation in `ru.json`, `ky.json`, `en.json`. RU is canonical (curated in flight). KY translations may be less polished initially — coherent + complete > polished + incomplete; **tracked as a pre-launch item: local-pharmacist KY review.** EN may be machine-translated as a starting point but **must be human-reviewed before production deploy** (also pre-launch). CI's `pnpm i18n:check` enforces all-three completeness, not just RU.
**Reference.** `BUILD_PROGRESS.md > Backlog > Pre-launch`.

### Q-10 — Search synonyms display
**Raised:** 2026-05-03 (Phase 0)
**Decision (2026-05-03).** **Render as a chip row above results:** "Также искали: грипп, ОРВИ" (per DESIGN §12.12). Empty `synonyms_used[]` → no chip row. Helps user understand why "температура" returned "парацетамол."

### Q-11 — Locale persistence
**Raised:** 2026-05-03 (Phase 0)
**Decision (2026-05-03).** FE sets `NEXT_LOCALE` cookie on switch (next-intl middleware default) **AND** sends `Accept-Language: <locale>` on every API call. URL prefix wins on first hit; logged-in users have `User.preferred_language` set from `Accept-Language` on OTP-verify and the FE uses it to default the URL on next visit.

### Q-12 — Order-status polling cadence
**Raised:** 2026-05-03 (Phase 0)
**Decision (2026-05-03).** TanStack Query `refetchInterval = 60_000` (60s) when `order.status` is non-terminal (`pending|confirmed|preparing|ready_for_pickup|out_for_delivery`). Polling stops on `delivered|cancelled|refunded`. `refetchIntervalInBackground: false` (pause on hidden tab).

### Q-13 — Image host configuration
**Raised:** 2026-05-03 (Phase 0)
**Decision (2026-05-03).** **Trust whatever URL the API returns** (absolute or relative). `next.config.ts` `images.remotePatterns` permissive in dev (`localhost:8000`); finalize prod CDN/R2 host at Phase 12 when backend Q15 closes. Relative URLs proxied through FE origin.

### Q-14 — Admin app start
**Raised:** 2026-05-03 (Phase 0)
**Decision (2026-05-03).** **Admin Phase A1 starts after storefront Phase 5** (auth foundations clear). Admin runs in parallel with storefront Phases 6-12 in a separate repo (`nookat-admin`).

### Q-15 — Real logo arrival
**Raised:** 2026-05-03 (Phase 0)
**Decision (2026-05-03).** Placeholder ships in Phase 2. Real logo from owner before Phase 12 (launch readiness). Per DESIGN §20 the rename protocol holds: 4-5 file edits to swap fully. Tracked in `BUILD_PROGRESS.md > Backlog > Pre-launch`.
