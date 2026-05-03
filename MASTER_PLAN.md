# Master Plan — Nookat Frontend

> **Phase 0 deliverable.** Authoritative reading list, endpoint inventory, i18n inventory, open questions with proposed defaults, confirmed phase order, and risks. Produced 2026-05-03.
>
> **Status:** Phase 0 complete pending owner confirmation of the open questions in §6.
>
> **Backend reference point:** `../pharmacy_backend` at `v1.0.0-rc1` (commit `fc457fe`, 2 trivial commits past the tag — both CSP + docs touch-ups, no contract change). Verified live at `http://localhost:8000` during Phase 0.

---

## 1. Reading completed

### 1.1 Frontend specs (this repo)

- [x] `CLAUDE.md` — full read; sacred invariants and operating principles internalized.
- [x] `specs/DESIGN_BLUEPRINT.md` — all 21 sections.
- [x] `specs/FRONTEND_BLUEPRINT.md` — all 24 sections.
- [x] `specs/FRONTEND_CLAUDE_CODE_PROMPTS.md` — Part 1, full phase TOC, Phase 0 prompt, Part 4 (meta-prompts), Part 5 (templates).

### 1.2 Backend reading (read-only)

- [x] `README.md`, `CLAUDE.md` (backend rulebook for context, not for compliance).
- [x] `BUILD_PROGRESS.md`, `DECISION_LOG.md`, `OPEN_QUESTIONS.md`, `RISKS.md`, `LAUNCH_CHECKLIST.md`, `CHANGELOG.md`.
- [x] `app/main.py`, `app/core/config.py`, `app/core/errors.py`, `app/core/i18n.py`, `app/core/idempotency.py`, `app/core/ratelimit.py`, `app/core/security.py`.
- [x] `app/api/deps.py`, `app/api/errors.py`, `app/api/middleware.py`.
- [x] `app/api/v1/*.py` — every customer router (auth, account, branches, cart, categories, checkout, me_orders, products, search, symptoms).
- [x] `app/api/admin_v1/*.py` — every admin router (auth, active_ingredients, audit, categories, inventory, manufacturers, orders, products, reports, symptoms).
- [x] `app/domain/identity/{schemas,services,dependencies}.py`.
- [x] `app/domain/catalog/storefront_schemas.py`, `app/domain/orders/{schemas,admin_schemas,cart_service,checkout_service,lifecycle}.py`.
- [x] `app/i18n/{ru,ky,en,synonyms_ru}.json`.
- [x] `specs/PRODUCT_BLUEPRINT.md` — product principles, personas, journeys, feature catalog, i18n, events, phasing.
- [x] `specs/PHARMACY_BLUEPRINT_2.md` — domain-rule highlights (FEFO, batch traceability, append-only stock_movements).

### 1.3 Live API smoke

- `GET http://localhost:8000/health` → `200`.
- `GET http://localhost:8000/openapi.json` → 71 paths, 33 customer-facing, ~37 admin-facing, plus `/api/webhooks/payments/freedom-pay`, `/health`, `/health/ready`. Customer paths match the source-derived inventory below 1:1.
- `GET /api/v1/categories` → `[]` (DB unseeded — fine for Phase 0; affects Phase 6+ E2E only; see R-7).
- `GET /api/v1/branches` → `[]` (same).

---

## 2. Customer endpoint inventory

All paths mounted at `/api/v1`. 33 endpoints. Cross-cutting concerns and schemas in §2.4.

### 2.1 Auth & account

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/otp/request` | none | `{phone}` | `OtpRequestOut{sent, expires_in_seconds}` | 202. Rate-limited: 1/60s/phone burst, 3/15m sustained, 10/h/IP. |
| POST | `/api/v1/auth/otp/verify` | none | `{phone, code}` | `TokenPairOut{access_token, refresh_token, token_type:"bearer", expires_in}` | Reads `Accept-Language` to seed `User.preferred_language` on auto-create. **Does NOT auto-merge guest cart** (see Q-5). |
| POST | `/api/v1/auth/refresh` | refresh in body | `{refresh_token}` | `TokenPairOut` | Rotates `jti`. 401 on invalid/expired/revoked. |
| POST | `/api/v1/auth/logout` | refresh in body | `{refresh_token}` | 204 | Idempotent; revokes `jti`. |
| POST | `/api/v1/auth/register` | none | `{email, password, phone, first_name?, last_name?, preferred_language="ru"}` | `RegisterOut` | Dev-only convenience. Storefront does NOT expose this (Q-7). |
| POST | `/api/v1/auth/login` | none | `{email, password}` | `TokenPairOut` | Dev-only convenience. Storefront does NOT expose this (Q-7). |
| GET | `/api/v1/me` | Bearer | — | `UserMeRead` | |
| PATCH | `/api/v1/me` | Bearer | `UserMeUpdate{first_name?, last_name?, email?, preferred_language?}` | `UserMeRead` | `extra="forbid"`. Phone is read-only via this route (Q-8). |
| GET | `/api/v1/me/addresses` | Bearer | — | `list[AddressRead]` | |
| POST | `/api/v1/me/addresses` | Bearer | `AddressCreate{label?, recipient_name?, recipient_phone?, city="Bishkek", address_line, landmark?, is_default=false}` | `AddressRead` | 201. |
| PATCH | `/api/v1/me/addresses/{id}` | Bearer | `AddressUpdate` (all optional, `extra="forbid"`) | `AddressRead` | 404 if not owned. |
| DELETE | `/api/v1/me/addresses/{id}` | Bearer | — | 204 | |

### 2.2 Catalog, search, branches

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/api/v1/categories` | none | — | `list[CategoryNode]` (recursive) | Server-cached. Reads `Accept-Language`. |
| GET | `/api/v1/categories/{slug}` | none | — | `CategoryDetail` (incl. breadcrumb) | 404 `category_not_found`. |
| GET | `/api/v1/categories/{slug}/products` | none | `in_stock_only=true`, `manufacturer_id?`, `sort: relevance\|price_asc\|price_desc\|name\|newest = relevance`, `page≥1=1`, `page_size 1..100=24` | `StorefrontProductsPage` | Server-cached. |
| GET | `/api/v1/symptoms` | none | — | `list[StorefrontSymptom]` | |
| GET | `/api/v1/symptoms/{slug}/products` | none | `in_stock_only=true`, `page`, `page_size` | `StorefrontProductsPage` | |
| GET | `/api/v1/branches` | none | — | `list[StorefrontBranch]` | Active branches only (today: 1). |
| GET | `/api/v1/products/{slug}` | none | — | `StorefrontProductDetail` | Cached ~5m. 404 `product_not_found`. |
| GET | `/api/v1/products/{slug}/related` | none | — | `list[StorefrontProductCard]` (≤4) | Same INN + dose, in-stock only. |
| GET | `/api/v1/search` | optional Bearer | `q (≥2 chars, REQUIRED)`, `in_stock_only=true`, `page`, `page_size` | `SearchResultPage` | Records `user_id` for analytics when token present. |
| GET | `/api/v1/search/suggest` | none | `q (≥2 chars)` | `SuggestResponse{products, categories, symptoms}` | Cached ~60s. |

### 2.3 Cart, checkout, orders

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/api/v1/cart` | CartOwner (user OR guest cookie) | — | `CartRead` | Mints `pharmacy_cart_session` cookie (HttpOnly, SameSite=Lax, 30d) for guests. |
| POST | `/api/v1/cart/items` | CartOwner | `{product_id, quantity 1..999}` | `CartRead` | 201. |
| PATCH | `/api/v1/cart/items/{id}` | CartOwner | `{quantity 1..999}` | `CartRead` | 400 `cart_owner_required` if neither user nor cookie. |
| DELETE | `/api/v1/cart/items/{id}` | CartOwner | — | 204 | |
| POST | `/api/v1/cart/clear` | CartOwner | — | `CartRead` | 404 if no cart. |
| POST | `/api/v1/checkout/quote` | CartOwner | `{address_id?, delivery_method, payment_method="cash_on_delivery"}` | `CheckoutQuoteResponse` (totals + `stock_conflicts[]` + `price_conflicts[]`) | Pure read. |
| POST | `/api/v1/checkout/place` | Bearer (NOT guest) | `PlaceOrderRequest` | `PlaceOrderResponse{order_id, order_number, status, payment_status, payment_method, delivery_method, total, currency, placed_at, payment_redirect_url?}` | 201. **`Idempotency-Key` REQUIRED** (400 `idempotency_key_required` else). 24h TTL. 409 `out_of_stock` / `idempotency_conflict`. |
| GET | `/api/v1/me/orders` | Bearer | `page≥1=1`, `page_size 1..100=24` | `Page[OrderListItem]` | |
| GET | `/api/v1/me/orders/{order_number}` | Bearer | — | `OrderRead` (with `items[]` + `history[]`) | 404 if not owned. |
| GET | `/api/v1/me/orders/{order_number}/status` | Bearer | — | `OrderStatusRead` (slim, polling-friendly) | |
| POST | `/api/v1/me/orders/{order_number}/cancel` | Bearer | `{reason?: ≤500 chars}` | `OrderRead` | 409 if not cancellable in current status. |
| POST | `/api/v1/me/orders/{order_number}/reorder` | Bearer | — | `ReorderResponse{cart_id, lines[]}` | Per-line `reason: added\|out_of_stock\|price_changed\|product_deleted\|max_per_order_capped`. |

### 2.4 Cross-cutting concerns

- **Headers we send.** `Authorization: Bearer <access>` on `/me*`, `/me/orders*`, `/checkout/place` (REQUIRED) and `/search` (optional). `Accept-Language: <ru|ky|en>` on every storefront call (drives localized fields and seeds `preferred_language` on first OTP-verify). `Idempotency-Key: <uuidv4>` REQUIRED on `POST /checkout/place` only. `X-Request-ID: <uuidv4>` on every call (ours; for trace stitching). `X-Branch-Id` is **not currently read** by the backend — see Q-6.
- **Cookies.** `pharmacy_cart_session`: HttpOnly, SameSite=Lax, Path=/, `Secure` only over HTTPS, `Max-Age=2592000` (30 days). Set by the backend on first guest cart interaction. Frontend must send it back; `credentials: "include"` is mandatory on cart calls.
- **Branch resolution.** `BranchIdDep` → hardcoded `branch_id = 1` (Bishkek Central). The dep is the seam where Phase-2 picker will land. We do not send a header today.
- **Idempotency-Key.** Header name `Idempotency-Key`. Backend stores `sha256(body)` keyed under `v1:idem:checkout:<user_id>:<key>` for 24h. Outcomes: `miss` execute+store; `hit_same` replay cached 201; `hit_different` → 409 `idempotency_conflict`. Frontend rule: generate one UUID v4 per **submission intent**; reuse on retry; regenerate on a fresh user-initiated submit.
- **Rate limits.** Backend rate-limits OTP request only: 1/60s/phone burst, 3/15m sustained per phone, 10/h per IP. Frontend renders a "Try again in {N}s" countdown on 429.
- **Pagination.** `Page[T] = {items, total, page, page_size}`. Cursor pagination exists in core but is unused on storefront.
- **Locale resolution.** Server reads ONLY `Accept-Language` in v1.0.0-rc1 (no `?lang=` query, no cookie). Resolves first comma-separated token whose primary subtag is in `ru|ky|en`; default `ru`.
- **CORS.** `allow_credentials=True`, all methods/headers allowed against the origins in `CORS_ORIGINS`. Frontend MUST use `credentials: "include"` for guest-cart cookie to flow.
- **Error envelope.** RFC 7807 ProblemDetails: `{type, title, status, code, detail, context?}`. Frontend keys off `code` (machine-readable, stable). Full code catalog in §2.6.

### 2.5 Schema appendix (storefront leaf shapes)

Identity:
- `UserMeRead = {id, phone, email?, first_name?, last_name?, preferred_language, is_phone_verified, is_active, created_at, last_login_at?}`
- `AddressRead = {id, label?, recipient_name?, recipient_phone?, city, address_line, landmark?, is_default, created_at, updated_at}`
- `TokenPairOut = {access_token, refresh_token, token_type:"bearer", expires_in}`

Catalog (storefront variants):
- `CategoryNode = {id, slug, name, icon_url?, sort_order, children: CategoryNode[]}`
- `CategoryDetail = {id, slug, name, description?, icon_url?, breadcrumb: BreadcrumbItem[]}`
- `StorefrontProductCard = {id, sku, slug, form, is_featured, name, short_description?, price, compare_at_price?, currency, is_in_stock, thumbnail_url?, score?}`
- `StorefrontProductDetail = card + {pack_size_label?, description?, usage_instructions?, side_effects?, contraindications?, composition?, manufacturer_{id,name,country}?, category_{id,slug,name}, requires_prescription, requires_cold_chain, active_ingredients[], symptoms[], images[]}`
- `StorefrontImage = {id, url, thumbnail_url?, medium_url?, large_url?, alt_text?, is_primary}`
- `StorefrontSymptom = {id, slug, name, icon_url?, sort_order}`
- `StorefrontBranch = {id, code, name, address, city, phone?, timezone, opens_at?, closes_at?}` (times as ISO strings)
- `SuggestResponse = {products[], categories[], symptoms[]}`
- `SearchResultPage = {items, total, page, page_size, synonyms_used: string[], popular_searches: string[]}`

Orders:
- `CartItemRead = {id, product_id, product_name?, product_slug?, thumbnail_url?, quantity, price_snapshot, current_price?, available_quantity?, is_in_stock?, line_total?, added_at, updated_at}`
- `CartTotalsRead = {subtotal, delivery_fee?, discount_amount=0, total?, free_delivery_threshold?, free_delivery_remaining?, currency:"KGS"}`
- `CartRead = {id, branch_id, currency, items, totals, expires_at}`
- `CheckoutQuoteResponse` = totals + `stock_conflicts[]{cart_item_id, product_id, requested_quantity, available_quantity}` + `price_conflicts[]{cart_item_id, product_id, snapshot_price, current_price}` + `cold_chain_warning`.
- `OrderItemRead = {id, product_id?, inventory_batch_id?, product_name_snapshot, product_sku_snapshot, batch_number_snapshot?, expiry_date_snapshot?, quantity, unit_price, line_total}`
- `OrderRead = {id, order_number, branch_id, status, payment_status, payment_method, delivery_method, recipient_name, recipient_phone, delivery_address?, subtotal, delivery_fee, discount_amount, total, currency, customer_notes?, cancel_reason?, placed_at, confirmed_at?, delivered_at?, cancelled_at?, items, history}`
- `OrderListItem = {id, order_number, status, payment_status, total, currency, placed_at, item_count?}`
- `OrderStatusRead = {order_number, status, payment_status, confirmed_at?, delivered_at?, cancelled_at?}`
- `ReorderResponseLine = {product_id?, product_name_snapshot, product_sku_snapshot, quantity_requested, added_to_cart, reason, snapshot_price?, current_price?}`

Enums to encode in the FE typed client:
- `delivery_method: "delivery" | "pickup"`
- `payment_method: "cash_on_delivery" | "card_online" | "mbank" | "elsom" | "odengi" | "balance_kg" | "bank_transfer"`
- `preferred_language: "ru" | "ky" | "en"`
- `sort: "relevance" | "price_asc" | "price_desc" | "name" | "newest"`
- `order.status: "pending" | "confirmed" | "preparing" | "ready_for_pickup" | "out_for_delivery" | "delivered" | "cancelled" | "refunded"`
- `reorder.reason: "added" | "out_of_stock" | "price_changed" | "product_deleted" | "max_per_order_capped"`

### 2.6 Error code catalog (frontend → i18n)

The FE will resolve `code` → `t("error.<code>")` with fallback to `t("error.generic")`. **Bold rows** are critical paths the FE must handle gracefully. Sourced from `app/core/errors.py` and every `code=` raise site.

Auth/identity (16): `account_locked` 403 · `email_already_registered` 400 · `**invalid_credentials**` 401 · `**invalid_otp**` 401 · `invalid_refresh` 401 · `invalid_session` 401 (admin) · `invalid_token` 401 · `missing_session` 401 (admin) · `**missing_token**` 401 · `**not_found_or_expired**` 401 (OTP) · `phone_already_registered` 400 · `**rate_limited**` 429 · `refresh_revoked` 401 · `**too_many_attempts**` 401 (OTP) · `unauthorized` 401 · `user_inactive` 401 · `**wrong_code**` 401 (OTP).

Address/account (2): `address_not_found` 404 · `address_required_for_delivery` 400.

Catalog (10): `category_has_children` 409 · `category_has_products` 409 · `**category_not_found**` 404 · `category_self_parent` 400 · `image_invalid` 400 · `ingredient_inn_exists` 409 · `ingredient_not_found` 404 · `manufacturer_name_exists` 409 · `manufacturer_not_found` 404 · `**product_not_found**` 404 · `product_image_not_found` 404 · `**query_too_short**` 400 · `slug_or_translation_required` 400 (admin) · `**symptom_not_found**` 404.

Cart/checkout (10): `**cart_empty**` 400 · `**cart_expired**` 410 · `**cart_item_not_found**` 404 · `**cart_not_found**` 404 · `cart_owner_required` 400 · `**checkout_conflict**` 409 (carries `stock_conflicts[]`/`price_conflicts[]` in `context`) · `**idempotency_conflict**` 409 · `**idempotency_key_required**` 400 · `**out_of_stock**` 409 · `product_unavailable` 409 · `quantity_must_be_positive` 400.

Orders (admin lifecycle, FE only sees a subset on `/me/orders/*`): `order_not_found` 404 · `forbidden_order` 403 · `reason_required` 400 (admin cancel) · `swap_not_allowed_in_status` 409 (admin).

RBAC (admin only): `forbidden_branch` 403 · `forbidden_role` 403 · `branch_param_missing` 403.

Catch-all: `conflict` 409 · `forbidden` 403 · `internal_error` 500 · `not_found` 404 · `validation_error` 400/422 (422 carries pydantic `errors[]`).

Frontend i18n key convention: `error.<code>` (e.g., `error.out_of_stock`, `error.idempotency_key_required`). Codes already keyed in backend i18n: `out_of_stock` (`error.out_of_stock`), `cart_expired` (`error.cart_expired`), `validation_error` (mapped to `error.generic`); the rest are FE-owned.

---

## 3. Admin endpoint inventory (high-level)

All paths mounted at `/api/admin/v1`. ~50 endpoints across 10 domains. Phase A1 will go deep on auth + the four CRUD-shaped domains; richer phases (A2-A6) follow.

| Domain | Count | Sample endpoints | Notes |
|---|---|---|---|
| **auth** | 3 | `POST /auth/login` (email + password + optional `totp_code`), `POST /auth/logout`, `GET /auth/me` | HttpOnly `admin_session` cookie, SameSite=Lax, 12h TTL. **No JWT.** |
| **manufacturers** | 5 | CRUD on `/manufacturers/{id}` | RBAC: `super_admin`, `content_editor`. |
| **active_ingredients** | 4 | List/create/get/patch | No DELETE. RU/UZ translations in Read schema. |
| **categories** | 5 | CRUD; `parent_id` filter for tree | RBAC: `super_admin`, `content_editor`. |
| **symptoms** | 4 | List/create/get/patch | No DELETE. `active_only` filter. |
| **products** | 9 | CRUD + image upload (`POST /products/{id}/images` — multipart, 201 inline ≤2MB or 202 + `job_id` queued) + CSV import dry-run/apply (≤500 rows inline, larger queued + Redis polling) | UUID PKs. Soft delete only. |
| **inventory** | 7 | Receive batch, patch batch, branch inventory, branch-product price patch, movements (8-filter surface), near-expiry (json/csv), low-stock (json/csv) | RBAC: `super_admin`/`branch_manager`/`pharmacist`. Branch-scoped (super bypasses). Pharmacist excluded from price patch. |
| **orders** | 10 | List, detail (`AdminOrderDetail` with internal-only fields), 7 lifecycle transitions (confirm, start-preparing, mark-ready, dispatch, mark-delivered, cancel, refund), swap-batch | **`Idempotency-Key` REQUIRED on refund.** Cancel requires `reason`. |
| **reports** | 2 | `GET /reports/sales`, `GET /reports/top-products` (both support `?format=csv` streaming) | Non-super pinned to own branch. |
| **audit** | 1 | `GET /audit` (filters: actor, entity_type, entity_id, action, from/to, paginated) | RBAC: `super_admin`/`branch_manager`. |

### 3.1 Admin auth model (FE implications)

- `credentials: "include"` on every request; cookie is HttpOnly so FE cannot read it.
- Single source of truth for "who am I and what can I do" is `GET /auth/me`. FE menu visibility, route gating, and action-button enablement all read from the cached `/auth/me` payload. Middleware checks for cookie *presence* only and redirects to `/login`; full validation happens server-side.
- 401 (`missing_session` / `invalid_session`) → redirect to login. 403 (`forbidden_role` / `forbidden_branch`) → render forbidden screen, do NOT log out.
- Branch scoping is server-enforced: non-super admins cannot read or mutate other branches even with a different `branch_id` query param.

### 3.2 Complex admin endpoints needing dedicated design

1. `POST /products/{id}/images` — dual-mode response. FE handles 201 inline path **and** 202 + `job_id` queued path. (Phase A3.)
2. `POST /products/import/{dry-run,apply}` + `GET /products/imports/{import_id}` — async CSV with Redis-backed progress poll. (Phase A3.)
3. `POST /orders/{id}/refund` — Idempotency-Key REQUIRED; same pattern as customer place_order. (Phase A2.)
4. CSV streaming exports on `reports/sales`, `reports/top-products`, `inventory/near-expiry`, `inventory/low-stock` — distinct "Download CSV" UX. (Phases A4, A5.)
5. Order lifecycle action panel — state-machine UI; each button conditional on `status`. `dispatch` collects `{courier_name, courier_phone}`; `cancel` collects reason. (Phase A2.)
6. `inventory/movements` — 8-filter surface (branch, product, movement_type, admin_user, order, date_from/to). Heavy filter UI. (Phase A4.)

### 3.3 Phase A1 vs later — recommendation

- **A1 (foundation):** API client (cookie credentials, error decoder, `/auth/me` boot), login/logout, role-gating helpers, sidebar shell, generic CRUD scaffold reused across **manufacturers + active_ingredients + categories + symptoms** (same shape), audit viewer (read-only first non-CRUD screen).
- **A2:** orders queue + detail + lifecycle + refund (idempotency).
- **A3:** products (CRUD + image upload dual-mode + CSV import progress).
- **A4:** inventory (receive batch, FEFO list, movements, low-stock + near-expiry CSV).
- **A5:** reports (sales + top-products with CSV).
- **A6:** audit polish + admin launch readiness.

---

## 4. i18n key inventory

### 4.1 Backend keys (mirror in FE)

Source: `pharmacy_backend/app/i18n/{ru,ky,en}.json`. RU is canonical (49 keys); KY and EN have 43 keys each — the 6 missing keys are the entire `sms.*` family, which is server-only (lifecycle SMS templates) and irrelevant to the FE bundle. All non-SMS keys exist in all three locales.

| Family | Backend keys | FE consumes? |
|---|---|---|
| `auth.otp.*` | `title, send_button, sent, code_label, verify_button, invalid, too_many` | ✅ |
| `auth.rate_limited` | (single key) | ✅ |
| `cart.*` | `empty.title, empty.cta, out_of_stock, price_changed` | ✅ |
| `checkout.delivery.*` | `address_label, recipient_label, landmark_hint` | ✅ |
| `checkout.payment.*` | `cod, card` | ✅ |
| `checkout.totals.*` | `subtotal, delivery, discount, total` | ✅ |
| `checkout.free_delivery_hint` (`{amount}`), `checkout.confirm_button` | (2 keys) | ✅ |
| `error.*` | `out_of_stock, cold_chain_delivery, cart_expired, delivery_area, network, generic` | ✅ |
| `order.status.*` | `pending, confirmed, preparing, ready_for_pickup, out_for_delivery, delivered, cancelled, refunded` | ✅ |
| `product.*` | `unavailable, alternatives.heading, same_ingredient.heading` | ✅ |
| `search.*` | `no_results.title (`{q}`), no_results.suggestion (`{suggestions}`), placeholder` | ✅ |
| `sms.*` | `otp, order_placed, order_confirmed, order_dispatched, order_delivered, order_cancelled` | ❌ server-side only |

`synonyms_ru.json` (28 entries: brand→INN, indication→symptom, cold/stomach/throat families, Latin→Cyrillic INN) is **server-side search expansion only**. FE just sends `q`; backend returns `synonyms_used[]` in the search response which the FE renders as a chip row (DESIGN §12.12).

### 4.2 Frontend-only key families (FE adds)

These are UI namespaces the backend does not emit. RU is mandatory; KY at top categories + key flows; EN legal-only at MVP launch (per DESIGN §18.1 and Q-9).

| Family | Sample keys | When |
|---|---|---|
| `brand.*` | `name`, `tagline` (used by `t()` in UI; `BRAND` constant for non-translatable) | Phase 4 |
| `nav.*` | `home, catalog, search, cart, orders, account, branches, help` | Phase 4 |
| `cta.*` | `add_to_cart, buy_now, continue, cancel, back, save, edit, delete, confirm, retry, view_details, view_all, apply, reset` | Phase 4 |
| `locale.*` | `ru, ky, en, switcher_label` | Phase 4 |
| `header.*` | `delivery_to, phone_support, login, logout, greeting ({name})` | Phase 4/5 |
| `footer.*` | `about, contacts, terms, privacy, delivery_info, payment_info, copyright ({year}), licenses` | Phase 4/12 |
| `home.*` | `hero.title, hero.subtitle, featured.title, categories.title, symptoms.title` | Phase 6 |
| `catalog.*` / `category.*` | `sort.{relevance,price_asc,price_desc,newest}, filter.in_stock, filter.price_range, empty, results_count ({count})` | Phase 6 |
| `product_detail.*` | `in_stock, out_of_stock, add_to_cart, quantity, composition, indications, contraindications, dosage, storage, manufacturer, expiry_note, requires_prescription_warning` | Phase 7 |
| `cart_page.*` | `title, item_count ({n}), proceed_to_checkout, continue_shopping, subtotal, estimated_delivery, remove_item, update_quantity` | Phase 8 |
| `checkout_page.*` | `step_delivery, step_payment, step_review, delivery_method.{pickup,delivery}, idempotency_replay` | Phase 9 |
| `account.*` | `profile, addresses, orders_history, preferred_language, logout_confirm` | Phase 5/10 |
| `order_page.*` | `title ({order_no}), placed_at, recipient, delivery_address, payment_method, tracking, cancel_button, reorder_button, cancel_reason_required` | Phase 10 |
| `branches.*` | `title, opening_hours, directions, phone` | Phase 6 |
| `empty_state.*` / `loading.*` | `no_results, try_again, default, searching, placing_order` | Phase 2/4 |
| `form.*` / `validation.*` | `required_field, invalid_phone, invalid_otp, optional, min_length ({min}), max_length ({max})` | Phase 5 |
| `a11y.*` | `skip_to_content, menu_open, menu_close, cart_count ({n})` | Phase 2/4 |
| `legal.*` | `terms_title, privacy_title, no_medical_advice_disclaimer` | Phase 12 |
| `error_page.*` | `404.title, 500.title, offline.title` | Phase 11 |
| `error.*` (FE-side codes not yet on backend) | `idempotency_key_required, idempotency_conflict, missing_token, invalid_token, ...` (full list per §2.6) | Phase 3 |

The frontend's `messages/<lang>.json` is a **superset** of the backend's `app/i18n/<lang>.json` — backend keys are mirrored exactly (same paths, same placeholders) so a single mental model applies on both sides; UI-only keys live in additional namespaces.

---

## 5. Confirmed phase order

Per `FRONTEND_CLAUDE_CODE_PROMPTS.md §23`. No deviations proposed.

| # | Phase | Goal | Dep | Est. sessions |
|---|---|---|---|---|
| 0 | Spec comprehension & master plan | This file. | — | 1 |
| 1 | Project foundation (storefront) | Next 15 boot, Tailwind, shadcn init, Sentry skeleton, ESLint/Prettier/Husky, CI. | 0 | 1 |
| 2 | Design system | Brand tokens in CSS vars, Tailwind theme, base shadcn components, brand placeholder logo. | 1 | 1–2 |
| 3 | API client + type generation | `openapi-typescript` pipeline, `openapi-fetch` wrapper, ApiError parser, env config. | 1 | 1 |
| 4 | i18n foundation | next-intl, locale routing, message JSON synced to backend, locale-aware formatters. | 1 | 1 |
| 5 | Auth & account | OTP flow, refresh interceptor, `/me`, addresses CRUD. | 3, 4 | 1–2 |
| 6 | Catalog browse (read-only) | Homepage, categories tree, category page, symptom page, branches. | 3, 4 | 1–2 |
| 7 | PDP & search | Product detail, related/substitutes, search results, autocomplete suggest. | 6 | 1–2 |
| 8 | Cart | Cart drawer, cart page, add/update/remove, guest cart cookie. | 5, 7 | 1 |
| 9 | Checkout & order placement | Quote, place_order with idempotency, payment branching (COD + card placeholder). | 8 | 1–2 |
| 10 | Order history & detail | `/orders`, `/orders/[orderNumber]`, status polling, cancel, reorder. | 9 | 1 |
| 11 | Hardening | SEO, perf, a11y, error states polish, JSON-LD, Lighthouse, axe pass. | 10 | 1–2 |
| 12 | Storefront launch readiness | Legal pages, CSP, security headers, deploy runbooks, smoke tests. | 11 | 1 |
| A1 | Admin foundation & login | Boot admin repo, session-cookie auth, sidebar shell, `/auth/me`. | parallel after Phase 5 | 1 |
| A2 | Admin orders queue & picking | Lifecycle action panel, refund (idempotent), batch swap. | A1 | 1–2 |
| A3 | Admin catalog CRUD | Manufacturers, ingredients, categories, symptoms, products + image upload + CSV import. | A1 | 2 |
| A4 | Admin inventory | Receive batch, batches list (FEFO), stock movements, low-stock + near-expiry. | A1 | 1–2 |
| A5 | Admin reports | Sales + top products (charts + CSV). | A1 | 1 |
| A6 | Admin audit & launch | Audit log + diff viewer, admin launch readiness. | A2-A5 | 1 |

Total: 13 storefront + 6 admin = **19 phases** over **~24-32 sessions**.

---

## 6. Open questions surfaced (proposed defaults; awaiting confirmation)

> Each has a proposed default chosen to keep momentum; please confirm or redirect. The defaults will be moved to `OPEN_QUESTIONS.md` (or `DECISION_LOG.md` if confirmed) before Phase 1.

### Q-1 — Branch picker UX
**Question.** The backend hardcodes `branch_id = 1` for storefront reads. Does the storefront expose any branch UI affordance at MVP, or stay single-branch with a footer/About note?
**Proposed default.** Single branch. Show "Аптека в Ноокате" in footer + About; do **not** plumb an `X-Branch-Id` header today. Pre-stub a `BranchContext` so a future picker is a one-component change.
**Why it matters.** Affects `/categories/{slug}/products` and `/search` request shape; affects whether we need a branches selector in the header.

### Q-2 — Card payment redirect handling
**Question.** `POST /checkout/place` for `payment_method=card_online` returns `payment_redirect_url` (Freedom Pay or fake adapter). How does the FE redirect — `window.location.assign()`, embedded iframe, or new tab?
**Proposed default.** `window.location.assign(payment_redirect_url)` — the customer leaves the FE for the gateway and returns via Freedom Pay's redirect-back URL. No iframe (X-Frame-Options on most gateways), no new tab (mobile-hostile). Card flow lands in Phase 9; at MVP per PRODUCT §23.1 it is **Phase 1.5** — at MVP the FE shows COD only and hides the card radio.
**Why it matters.** Defines the post-place_order success-page logic and the "thank you / awaiting payment" branching.

### Q-3 — PWA scope at MVP
**Question.** Manifest + favicons + theme-color only, or full PWA with service worker + offline mode?
**Proposed default.** Manifest + favicons + theme-color only. No service worker. Add-to-home-screen on Android works; offline mode is non-trivial and deferred.
**Why it matters.** Service worker adds complexity (cache invalidation; iOS quirks).

### Q-4 — Refresh-token transport
**Question.** Backend's `POST /auth/refresh` accepts the refresh token in the **JSON body**, not in a cookie. Where does the FE store it client-side?
**Proposed default.** Per `FRONTEND_BLUEPRINT §8.1`: a tiny Next.js Route Handler (`/api/auth/set-tokens`) that wraps the refresh into an **HttpOnly, Secure, SameSite=Lax cookie named `nookat_refresh`** at the FE's own origin. JS never touches the refresh token. A second route handler (`/api/auth/refresh-tokens`) reads the cookie and proxies to the backend. Access token stays in memory (Zustand). Concurrent 401s share a single in-flight refresh.
**Why it matters.** OWASP-recommended pattern for SPA refresh tokens. Locks XSS exposure to access-token lifetime (15 min) only.

### Q-5 — Cart-merge on OTP-verify (backend gap)
**Question.** Per the backend audit, `POST /auth/otp/verify` does **not** invoke `CartService.merge_guest_into_user`. The merge service exists but no route triggers it. What does the FE do when a guest with a `pharmacy_cart_session` cookie logs in?
**Proposed default (FE-side workaround for MVP).** After successful OTP-verify, the FE issues `GET /api/v1/cart` with **both** the new Bearer **and** `credentials: "include"` (so the cookie also flows). The backend's `get_cart_owner` dep will return `(user, None)` and ignore the cookie; the user's existing cart is returned, and the guest cart cookie remains stale. The guest cart contents are **lost** in this flow — which contradicts PRODUCT §F-CART-001's "guest+merge cart."
**Better outcome (request to backend).** Either (a) wire `merge_guest_into_user` into the OTP-verify route, or (b) add an explicit `POST /api/v1/cart/merge` endpoint the FE calls after login. **Recommend option (b)** — keeps the boundary clean and lets the FE control timing (e.g., merge during OTP success transition, not on the verify call itself, so a placeholder loading state can show "Объединяем корзину…").
**Why it matters.** This is on the J-01 conversion path. If a customer adds items as a guest, hits the auth wall at place-order, and loses their cart, the funnel breaks. **Strongly recommend escalating to the backend team during Phase 0 sign-off.**

### Q-6 — `X-Branch-Id` header
**Question.** Should the FE send `X-Branch-Id: 1` speculatively even though the backend ignores it today?
**Proposed default.** No. Don't send a header that has no effect — it just adds noise to the request log. Define a `BRANCH_ID = 1` constant and a `BranchContext` boundary; when the backend wires the dep to read the header, the FE flips one flag.
**Why it matters.** Forward-compat without speculative writes.

### Q-7 — Dev-convenience auth (`/auth/register`, `/auth/login`)
**Question.** Backend exposes email/password endpoints "for local-dev Swagger testing." Should the storefront UI expose these, or stick to OTP-only?
**Proposed default.** OTP-only on the customer storefront — per PRODUCT §F-AUTH-001 ("SMS-OTP login"). The dev endpoints stay backend-only and are documented in `BUILD_PROGRESS.md > Smoke recipes` for Phase 5 testing (faster than waiting for fake-SMS log scraping).
**Why it matters.** Keeps the customer surface clean; preserves OTP as the conversion-gate UX.

### Q-8 — Phone-change flow
**Question.** Can a logged-in customer change their phone number? Backend's `PATCH /me` is `extra="forbid"` and does not accept `phone`.
**Proposed default.** Phone is read-only on `/account/profile` for MVP. Changing it is a Phase-1.5 backlog item (per PRODUCT §23.2). FE shows "Чтобы сменить номер, [позвоните нам]." with the support phone CTA.
**Why it matters.** Sets account-page expectations and the PRODUCT §23.2 backlog item.

### Q-9 — KY/EN coverage at launch
**Question.** What's the minimum KY/EN coverage the FE ships at MVP launch?
**Proposed default.** Per DESIGN §18.1: **RU** complete (all keys); **KY** at top categories, hero, search, cart, checkout, account, orders (skip legal pages); **EN** legal pages + brand tagline only. `OPEN_QUESTIONS.md` tracks any missing KY/EN keys per phase; CI's `pnpm i18n:check` enforces RU completeness only at MVP.
**Why it matters.** Translation budget. Owner / a Kyrgyz speaker reviews KY before launch.

### Q-10 — Search synonyms display
**Question.** `/search` returns `synonyms_used: string[]`. Render or hide?
**Proposed default.** Render as a chip row above results: "Также искали: грипп, ОРВИ" — per DESIGN §12.12. Helps the user understand why "температура" returned "парацетамол." Empty array → no chip row.
**Why it matters.** Trust + transparency in search; surfaces the synonym dictionary value.

### Q-11 — Locale persistence
**Question.** next-intl uses URL prefix as primary, plus a `NEXT_LOCALE` cookie for persistence. Backend reads ONLY `Accept-Language` (no cookie, no query). How do we keep them aligned?
**Proposed default.** FE sets `NEXT_LOCALE` cookie on switch (next-intl middleware default) **AND** sends `Accept-Language: <locale>` on every API call so the server resolves to the same language. URL prefix wins on first hit; logged-in users' `User.preferred_language` is set from `Accept-Language` on OTP-verify and used by the FE on subsequent visits.
**Why it matters.** Avoids cases where the UI shows RU but the server returns RU-localized fields differently.

### Q-12 — Order-status polling cadence
**Question.** FE polls `/me/orders/{n}/status` for active orders. What cadence?
**Proposed default.** TanStack Query `refetchInterval = 60_000` (60s) when the order is in a non-terminal status (`pending|confirmed|preparing|ready_for_pickup|out_for_delivery`); polling stops on `delivered|cancelled|refunded`. Pause polling when the tab is hidden (`refetchIntervalInBackground: false`).
**Why it matters.** Don't burn battery / API quota; keep the customer's expectations calibrated.

### Q-13 — Image host configuration
**Question.** Backend's `IMAGE_PUBLIC_BASE_URL` defaults to `/static/images` in dev; production R2 URL is gated on backend Q15. How does FE configure `next/image` `remotePatterns`?
**Proposed default.** Trust whatever URL the API returns (absolute or relative). Configure `next.config.ts` `images.remotePatterns` permissively for dev (`localhost:8000`) and add the prod CDN/R2 host **at Phase 12** when the backend's R2 contract closes. If the URL is relative, the FE proxies through its own origin.
**Why it matters.** R2 CDN host shape is unknown until backend Q15 closes; we don't want to hardcode a placeholder pattern.

### Q-14 — Admin app start
**Question.** When does Admin Phase A1 start?
**Proposed default.** After storefront Phase 5 (auth foundations clear). Admin can run in parallel with storefront Phases 6-12; the admin app is in a separate repo (`nookat-admin`) so does not conflict.
**Why it matters.** Resource planning; admin has different auth and a different audience; running in series doubles the calendar time unnecessarily.

### Q-15 — Real logo arrival
**Question.** DESIGN §1.5 specifies a placeholder wordmark + tilted-pill mark for Phase 0. When does the real logo arrive?
**Proposed default.** Ship placeholder in Phase 2; flag in `LAUNCH_CHECKLIST` for swap before public launch. Owner provides final logo before Phase 12. Per DESIGN §20 the rename protocol holds: 4-5 file edits to swap fully.
**Why it matters.** Keeps Phase 2 unblocked; protects brand-rename discipline.

---

## 7. Risks

> Mitigation status: 🟢 mitigated · 🟡 monitoring · 🔴 active.

### R-1 — Backend OpenAPI drift 🟢
**Description.** Backend evolves; FE types drift silently.
**Mitigation.** `pnpm types:check` in CI fails the build on drift. `feat(api): regenerate types from backend@<sha>` is the standard commit pattern. Backend bumps trigger a regeneration commit before any other work in the affected phase.

### R-2 — KG audience network reality 🟡
**Description.** Customers in Nookat / rural Osh on 3G; mid-range Android median device.
**Mitigation.** Strict perf budget (LCP ≤ 2.5s on Slow 3G; ≤180 KB JS gz per route). Lighthouse CI gate. Coolify on same VPS as backend (close geographic proximity).

### R-3 — Brand-name rename later 🟢
**Description.** Owner may rebrand. Hardcoded "Nookat" multiplies the rename cost.
**Mitigation.** Single source of truth (`lib/brand.ts` + `messages/*.json` + `public/brand/`). Code-review gate: no literal "Nookat" outside those files. `BRAND.name` (TS) or `t("brand.name")` (UI) everywhere else.

### R-4 — Backend launch blockers Q13/Q14/Q15 🔴 (external)
**Description.** Backend's three deferred adapters — Nikita SMS (Q13), Freedom Pay (Q14), Cloudflare R2 (Q15) — are scaffolds raising `NotImplementedError`.
**Frontend impact.** OTP works in dev (fake SMS, code in uvicorn log). Card payment works against fake adapter only — at launch FE shows COD only (per PRODUCT §23.1 card is Phase 1.5 anyway). Image URLs come from API; FE configures `remotePatterns` at Phase 12 when host is known.
**Mitigation.** Track in `RISKS.md`. Phase 9 ships COD only, with the card radio code-complete but feature-flagged off. Phase 12 launch gated on Q13 closing (real OTP) and CORS / image host wiring — but **not** on Q14 (card is Phase 1.5).

### R-5 — Cart-merge backend gap 🔴
**Description.** Backend's OTP-verify does not call `merge_guest_into_user`. FE workaround silently loses guest-cart contents. Discovered during Phase 0 backend audit.
**Mitigation.** Escalate to backend team during Phase 0 sign-off (Q-5). Preferred fix: backend adds `POST /api/v1/cart/merge` endpoint. If not fixed, FE flags the limitation in the auth wall copy ("Войдите, чтобы оформить заказ — товары в корзине сохранятся" becomes false; need to caveat).

### R-6 — Refresh-token transport asymmetry 🟢
**Description.** Backend issues + accepts refresh tokens in JSON body; FE wraps them in an HttpOnly cookie at its own origin via Route Handler.
**Mitigation.** Documented in Q-4. Single in-flight refresh (no thundering herd). Auth tests cover the route-handler wrapping path; Phase 5 ships the pattern with a test for concurrent 401s.

### R-7 — Backend DB unseeded for E2E 🟡
**Description.** Live backend `GET /categories` and `/branches` return `[]` — DB has no fixtures running today. E2E tests need a seeded DB.
**Mitigation.** Phase 5 onward we run backend with `make docker-up` + `make seed` (verify the backend has a seed make-target; if not, escalate). E2E uses Playwright with backend's `dev/fixtures/`.

### R-8 — KY/EN translation curation 🟡
**Description.** No AI auto-translate (DESIGN §18.6). Human curation needed for KY/EN keys.
**Mitigation.** Per Q-9, RU complete + KY top flows + EN legal at MVP. Owner / Kyrgyz speaker reviews KY before launch. CI enforces RU completeness; KY/EN gaps tracked in `OPEN_QUESTIONS.md`.

### R-9 — i18n drift between FE and BE 🟢
**Description.** Backend adds a key (e.g., new error code); FE doesn't mirror it; user sees a fallback message.
**Mitigation.** Phase 4's `pnpm i18n:check` validates every BE key has a FE counterpart (excluding `sms.*` server-only family). New error codes from backend trigger a FE i18n update commit. Documented in `DECISION_LOG.md` template.

### R-10 — Lighthouse CI reachability on Coolify 🟡
**Description.** Lighthouse CI in PRs needs a deployed preview URL. Coolify supports deploy previews per branch; configuration TBD.
**Mitigation.** Phase 11 sets up the preview pipeline. If Coolify previews are flaky, fall back to Lighthouse against a containerized build inside the GH Actions runner.

### R-11 — Single VPS production failure (inherits from backend) 🟡
**Description.** Backend RISKS R-9: single-VPS prod. FE on same VPS shares the SPOF.
**Mitigation.** Cloudflare in front of FE Caddy/Traefik (CDN edge serves cached homepage / static assets even if origin down). HA roadmap is Phase-2 (post-MVP) per backend RISKS.

---

## 8. Architectural decisions confirmed (from FRONTEND_BLUEPRINT)

These are not open questions — they are already decided in the spec and recorded here for reference. They will be appended to `DECISION_LOG.md` at Phase 1.

- **Two repos, no monorepo** (FRONTEND §3). `nookat-storefront` and `nookat-admin`. Promote to a published `@nookat/shared` package at Phase 1.5 if duplication hurts.
- **Coolify on same VPS as backend** (FRONTEND §2.6). Not Vercel — KG-edge latency.
- **next-intl** for i18n (FRONTEND §13).
- **TanStack Query v5** for server state, **Zustand** for narrowly-scoped UI state (FRONTEND §10, §11).
- **shadcn/ui** copy-paste owned components on Radix primitives (FRONTEND §2.1).
- **react-hook-form + Zod** for forms (FRONTEND §12).
- **openapi-typescript + openapi-fetch** for typed API client (FRONTEND §6, §7).
- **Tailwind 4 with design tokens in CSS custom properties** (DESIGN §4-10, FRONTEND §2.1).
- **App Router with RSC default; `"use client"` justified per occurrence** (FRONTEND §9.2).
- **JWT bearer for customers; HttpOnly session cookie for admin** (FRONTEND §8). Refresh wrapped in cookie at FE origin (Q-4).
- **Strict TypeScript** with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` (FRONTEND §21.1).
- **Conventional Commits** with shared scope vocabulary (FRONTEND §21.6).
- **Sentry for errors + web vitals**; no analytics at MVP (FRONTEND §2.5, §19).

---

## 9. Definition of Done — Phase 0

- [x] All four frontend spec files read end-to-end (DESIGN §1-21, FRONTEND §1-24, PROMPTS Parts 1+4+5, CLAUDE.md).
- [x] Backend repo audited via parallel sub-agents: customer endpoints, admin endpoints, i18n inventory, core wiring (auth/cart/idempotency/locale/errors/env).
- [x] Backend running locally and verified at `http://localhost:8000` (health 200; OpenAPI 71 paths; customer paths match source-derived inventory).
- [x] Customer endpoint inventory complete (33 endpoints; method, path, auth, request, response, notes).
- [x] Admin endpoint inventory at high-level (10 domains, ~50 endpoints, complex endpoints called out).
- [x] i18n key inventory complete (12 backend families + 19 FE-only families proposed).
- [x] 15 open questions surfaced with proposed defaults.
- [x] Phase order confirmed: 13 storefront + 6 admin = 19 phases.
- [x] 11 risks listed with mitigation status.
- [x] `MASTER_PLAN.md` committed to project root.
- [ ] Phase 0 summary posted in chat with the open-questions list and recommended defaults — **awaiting owner confirmation before Phase 1**.

---

*Master Plan v1.0 — Phase 0 deliverable. Updates after this point go to `DECISION_LOG.md` (resolved questions), `OPEN_QUESTIONS.md` (still open), `RISKS.md` (active risks), and `BUILD_PROGRESS.md` (phase status). Do not edit this file after Phase 0 sign-off.*
