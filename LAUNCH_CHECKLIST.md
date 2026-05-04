# Launch Checklist — Nookat Storefront

> **The gate before public launch.** Every box must be checked (or explicitly waived) before the storefront serves real customers at `https://nookat.kg`.
>
> Phase 12 deliverable. Mirrors the backend's `LAUNCH_CHECKLIST.md` pattern. Items are grouped by responsibility area — `code` for engineering work, `content` / `ops` / `legal` for human work.
>
> **Source of truth for outstanding items lives in `BUILD_PROGRESS.md > Backlog > Pre-launch checklist`.** This file links there rather than duplicating; that way the backlog and the launch gate cannot drift.

---

## Code & tests

- [x] All Phase 0–12 acceptance criteria green (`BUILD_PROGRESS.md > Phases`)
- [x] Verification gate runs locally without `.env.local`: `pnpm lint && typecheck && test && i18n:check && build && build:ci && e2e --grep-invert @requires-backend && launch:check`
- [x] CI green on `main` (GitHub Actions)
- [x] Phase 11 hardening complete: SEO + perf + a11y + Sentry SDK + security headers (`v0.11.0`)
- [x] Phase 12 launch readiness: legal shells + runbooks + smoke suite + launch-checks (`v1.0.0-rc1`)
- [ ] Smoke suite passes against staging: `E2E_BASE_URL=https://staging.nookat.kg pnpm smoke`
- [ ] Smoke suite passes against production: `E2E_BASE_URL=https://nookat.kg pnpm smoke`

## Security

- [x] Security headers in `next.config.ts` (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy minimal)
- [x] No secrets committed (`.env.local` gitignored; `.env.example` ships placeholder values only)
- [x] Refresh token only in HttpOnly cookie (sacred-invariant)
- [x] No PII logged client-side (sacred-invariant — verified by `tests/unit/scrub.test.ts` + `pnpm launch:check`)
- [x] No `dangerouslySetInnerHTML` outside `lib/seo/jsonld.tsx` (verified by `pnpm launch:check`)
- [ ] CSP enforced (start in Report-Only at staging deploy, monitor for ≥ 1 week, then enforce — see `docs/runbooks/deploy.md`)
- [ ] HSTS verified at staging (`curl -I https://staging.nookat.kg | grep strict-transport-security`)
- [ ] HSTS verified at production
- [ ] `pnpm audit` shows 0 high/critical at deploy time
- [ ] Backend CORS includes `https://nookat.kg` (and `https://admin.nookat.kg` for admin)

## Observability

- [x] Sentry SDK wired (`@sentry/nextjs` v10; `instrumentation.ts` + `sentry.{server,edge}.config.ts` + `instrumentation-client.ts`)
- [x] PII scrub at two layers (`trace()` + `beforeSend`)
- [x] Web Vitals → Sentry breadcrumbs (`<WebVitalsReporter />`)
- [ ] Real `SENTRY_DSN` configured in Coolify staging env
- [ ] Real `SENTRY_DSN` configured in Coolify production env (separate project)
- [ ] First test error appears in Sentry within 5 min of staging deploy
- [ ] Web Vitals dashboard shows real numbers from staging
- [ ] Sentry alert routing configured (PagerDuty / Telegram bot — TBD)
- [ ] `SENTRY_AUTH_TOKEN` set so source maps upload during Coolify build

## Deployment

- [x] `Dockerfile` multistage build (deps → builder → runtime)
- [x] Build-time env stubs in builder stage (`API_URL`, `NEXT_PUBLIC_*`)
- [x] Healthcheck on `/api/health` (Coolify-compatible)
- [x] `docs/runbooks/deploy.md` — Coolify procedure + env var reference
- [x] `docs/runbooks/monitoring.md` — Sentry + Web Vitals navigation
- [x] `docs/runbooks/incidents.md` — site-down / OTP / place-order playbooks
- [ ] Coolify project configured for staging (`staging.nookat.kg`)
- [ ] Coolify project configured for production (`nookat.kg`)
- [ ] Auto-deploy on push to `main` (production) and `staging` branch (staging)
- [ ] DNS A-records point to VPS for `nookat.kg`, `staging.nookat.kg`
- [ ] TLS certs provisioned by Caddy/Coolify Traefik (auto-renew enabled)
- [ ] Disaster-recovery procedure tested at least once (rollback dry-run via Coolify UI)

## Content

- [x] Legal page shells exist (`/legal/{terms,privacy,delivery,returns}`) with placeholder banner + sacred-invariant #4 phone CTA
- [x] Legal pages set `robots:noindex,nofollow` until real text lands
- [ ] **Real legal text** for Terms, Privacy, Delivery, Returns (legal review). Owners: business + counsel. Code-side action when text lands: replace placeholder copy in `legal.{terms,privacy,delivery,returns}.title` keys + add per-section copy keys; flip `robots: { index: true, follow: true }` on each page; add the routes to `app/sitemap.ts`.
- [ ] **Real `BRAND.supportPhone`** in `lib/brand.ts` (currently placeholder `+996 XXX XX XX XX`). Owner: business.
- [ ] **Real `BRAND.licenseNumber`** in `lib/brand.ts` (currently `№XXXXX`). Owner: business.
- [ ] **Real `BRAND.address`** in `lib/brand.ts`. Owner: business.
- [ ] Homepage hero copy reviewed for marketing language (sacred-invariant — no «лучший», «самый», «100% original»)
- [ ] About page reviewed for license + branch info accuracy
- [ ] Empty-state copy reviewed for tone (no symptom-to-prescription advice on symptom-no-products surface)

## Brand

- [ ] **Real Nookat logo** swapped in `public/brand/` (DESIGN §20 rename protocol — 4-5 file edits). Owner: business + design.
- [ ] Favicons regenerated from real logo (16×16, 32×32, 180×180 apple-touch, OG 1200×630)
- [ ] OG image generated for production (matches DESIGN §13.x social card)
- [ ] No literal "Nookat" in code outside the allowed sources (verified by `pnpm launch:check`)

## i18n

- [x] All keys exist in all three locales (`pnpm i18n:check` enforces parity in CI)
- [x] RU is canonical (curated)
- [ ] **KY translations reviewed by a local Kyrgyz pharmacist.** Coherent + complete is OK at MVP; polished is the pre-launch bar (`OPEN_QUESTIONS.md Q-9`).
- [ ] **EN translations human-reviewed.** Machine translation OK as starting point; production gate is human review (`OPEN_QUESTIONS.md Q-9`).

## Accessibility

- [x] Phase 11E e2e a11y suite green on critical-tier (5 specs, full-page axe scans)
- [x] Phase 11E component axe contract green (9 cases on representative patterns)
- [ ] Color-contrast pass on muted-ink tokens (serious-tier; `BUILD_PROGRESS.md > Backlog > A11y polish`)
- [ ] `<dl>` structural fix on `/ru/about`
- [ ] **Manual NVDA + VoiceOver pass** on the J-01 happy path. Out-of-band human work.
- [ ] **Keyboard-only J-01 walkthrough** — every interactive reachable, no traps, focus rings visible.

## Backend coordination

- [ ] Backend Q13 (Nikita SMS) closed → real OTP works in production. Currently uses fake-SMS adapter that logs codes to stdout. **Hard launch blocker.**
- [ ] OQ-24 (PDP `is_in_stock` asymmetry) reconciled. PDP and category list must agree on stock for the same product/branch. **Hard launch blocker** per `BUILD_PROGRESS.md > Pre-launch checklist > Backend blockers`. When fixed: flip `tests/e2e/cart-flow.spec.ts` line 105 from `expect(cta).toBeDisabled()` to assert the happy path on PDP.
- [ ] Backend Q14 (Freedom Pay card-online) — soft blocker. COD-only at MVP per Q-2; card lands in Phase 1.5.
- [ ] Backend Q15 (Cloudflare R2) — soft blocker. Local-disk image storage works at MVP; R2 hostname needs adding to `next.config.ts > images.remotePatterns` when it lands.
- [ ] OQ-16 (`POST /api/v1/cart/merge`) — soft blocker. FE workaround in `lib/cart/merge.ts` is acceptable for MVP.
- [ ] Backend's `LAUNCH_CHECKLIST.md` is itself green (cross-team gate).

## Smoke tests

- [x] `tests/smoke/` suite covers homepage, PDP, search, /api/health, security headers, sitemap + robots
- [x] Smoke is read-only — no OTP login, no place-order. Mutations verified via the e2e `@requires-backend` suite against a known dev backend, not against staging/production.
- [ ] CI runs smoke suite against staging post-deploy on every push to `staging` branch
- [ ] CI runs smoke suite against production post-deploy on every push to `main`

## Final gate

- [ ] Operator confirms every box above is checked or has a documented waiver in `RISKS.md`
- [ ] `BUILD_PROGRESS.md > Backlog > Pre-launch checklist` has zero open boxes
- [ ] DNS pointed at production
- [ ] Customer-support team trained on the J-02 reorder flow (so they can diagnose customer questions)
- [ ] Tag `v1.0.0` (no `-rc1`) created and pushed; production deploy uses this tag

---

## Out of scope at launch (Phase 1.5+)

These are post-launch by explicit decision (PRODUCT §23.1, MASTER_PLAN §6 Q-2):

- Card-online payment (gated on backend Q14)
- mbank / elsom / odengi / balance_kg / bank_transfer (per-method post-launch evaluation)
- Phone-change flow (PATCH /me forbids `phone` field; backend re-OTP-on-change first)
- Search autocomplete polish (PRODUCT F-CAT-005)
- Active-ingredient filter (PRODUCT F-CAT-006)
- WhatsApp support button
- A/B testing infra
- Analytics integration (PRODUCT §10 — Plausible / Yandex.Metrica)
- `@nookat/shared` published package (consider when storefront/admin duplication hurts)
- Service worker / PWA (Q-3)
- Branch picker UI (Q-1; backend Q-6 first)
- Real product photography (typography-led at MVP)

---

_Tracking the human-work items: `BUILD_PROGRESS.md > Backlog > Pre-launch checklist` is the canonical list; this file links rather than duplicates._
