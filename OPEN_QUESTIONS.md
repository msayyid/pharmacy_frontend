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
