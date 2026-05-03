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
