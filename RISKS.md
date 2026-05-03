# Risks

> Active risks with mitigation status. Closed risks move to the **Archived** section. Format per `FRONTEND_CLAUDE_CODE_PROMPTS.md §Templates`.
>
> Status legend: 🟢 mitigated · 🟡 monitoring · 🔴 active.

---

## R-1 — Backend OpenAPI drift 🟢

**Raised:** 2026-05-03 (Phase 0)
**Description.** Backend evolves; FE types drift silently and runtime mismatches reach production.
**Likelihood.** High over time.
**Impact.** Medium — TypeScript catches structural mismatches; runtime mismatches possible on shapes the FE never reads.
**Mitigation.** `pnpm types:check` in CI fails the build on drift (lands in Phase 3). Standard commit pattern `feat(api): regenerate types from backend@<sha>` triggers FE-side fan-out before any phase work touches the affected domain.

## R-2 — KG audience network reality 🟡

**Raised:** 2026-05-03 (Phase 0)
**Description.** Customers in Nookat / rural Osh on 3G; mid-range Android median device.
**Likelihood.** High.
**Impact.** Medium — slow LCP loses conversion at the auth wall.
**Mitigation.** Strict perf budget (LCP ≤ 2.5s on Slow 3G; ≤180 KB JS gz per route per FRONTEND §17). Lighthouse CI gate at Phase 11. Coolify on the same VPS as backend (close geographic proximity to KG audience).

## R-3 — Brand-name rename later 🟢

**Raised:** 2026-05-03 (Phase 0)
**Description.** Owner may rebrand from "Nookat." Hardcoded brand strings multiply the rename cost.
**Likelihood.** Low (acknowledged at kickoff).
**Impact.** Low (if the discipline holds).
**Mitigation.** Single source of truth: `lib/brand.ts` + `messages/<lang>.json` + `public/brand/`. Code-review gate: no literal "Nookat" outside those files. ESLint rule and a grep gate before launch (Phase 12).

## R-4 — Backend launch blockers Q13/Q14/Q15 🔴 (external)

**Raised:** 2026-05-03 (Phase 0)
**Description.** Backend's three deferred adapters — Nikita SMS (Q13), Freedom Pay (Q14), Cloudflare R2 (Q15) — are scaffolds that raise `NotImplementedError`.
**Likelihood.** High (already true).
**Impact.** OTP works in dev only (fake SMS, code in uvicorn log); card payment works against fake adapter only; image URLs depend on R2 host shape.
**Mitigation.** FE ships COD-only at MVP (per Q-2 / OPEN_QUESTIONS.md). Card radio is feature-flagged off. Image `remotePatterns` finalize at Phase 12 once Q15 closes. Phase 12 launch gated on Q13 closing (real OTP), not Q14 (card is Phase 1.5 anyway).

## R-5 — Cart-merge backend gap 🔴

**Raised:** 2026-05-03 (Phase 0)
**Description.** Backend's `POST /auth/otp/verify` does not invoke `merge_guest_into_user`. Without intervention, a guest with items in cart loses them on login.
**Likelihood.** High (every guest→user transition).
**Impact.** Medium — breaks J-01 conversion if not handled.
**Mitigation.** FE workaround in Phase 5: sequential re-add of guest-cart items via `POST /cart/items` after OTP-verify success. Best-effort, loses price snapshots, preserves intent. Tracked separately in `OPEN_QUESTIONS.md OQ-16` for the proper backend endpoint. Telemetry on FE workaround failures will inform whether to escalate to backend post-MVP.

## R-6 — Refresh-token transport asymmetry 🟢

**Raised:** 2026-05-03 (Phase 0)
**Description.** Backend issues + accepts refresh tokens in JSON body, not a cookie. FE has to wrap into HttpOnly cookie at its own origin.
**Likelihood.** N/A (architectural).
**Impact.** N/A.
**Mitigation.** Documented in `OPEN_QUESTIONS.md Q-4` and `DECISION_LOG.md`. Phase 5 ships the route-handler wrapping pattern with tests for concurrent 401 (single in-flight refresh, no thundering herd). Auth tests in Phase 5 cover the round-trip including token-rotation.

## R-7 — Backend DB unseeded for E2E 🟡

**Raised:** 2026-05-03 (Phase 0)
**Description.** Live backend `GET /categories` and `/branches` return `[]` — DB has no fixtures running today. Phase 6+ E2E tests need seeded data.
**Likelihood.** High at the moment.
**Impact.** Medium — blocks Phase 6 onward E2E unless seeded.
**Mitigation.** Phase 5 onward, run backend with `make docker-up && make seed`. If no `seed` make-target exists, escalate to backend team. E2E can use Playwright fixtures that POST to admin endpoints to seed before customer-side tests run.

## R-8 — KY/EN translation curation 🟡

**Raised:** 2026-05-03 (Phase 0)
**Description.** No AI auto-translate per DESIGN §18.6. Human curation required.
**Likelihood.** N/A (process risk).
**Impact.** Medium — non-RU keys risk being incorrect or stale.
**Mitigation.** Per Q-9: all three locales fully populated at MVP; KY pre-launch reviewed by a local pharmacist, EN pre-launch human-reviewed. Tracked in `BUILD_PROGRESS.md > Backlog > Pre-launch`. CI's `pnpm i18n:check` (Phase 4) enforces all-three completeness, not just RU.

## R-9 — i18n drift between FE and BE 🟢

**Raised:** 2026-05-03 (Phase 0)
**Description.** Backend adds a key (e.g., new error code); FE doesn't mirror; user sees a fallback message.
**Likelihood.** Low if process holds.
**Impact.** Low (graceful fallback to `error.generic`).
**Mitigation.** Phase 4's `pnpm i18n:check` validates every BE key has a FE counterpart (excluding `sms.*` server-only family). New error codes from backend trigger a FE i18n update commit before any code that emits the new error is consumed.

## R-10 — Lighthouse CI reachability on Coolify 🟡

**Raised:** 2026-05-03 (Phase 0)
**Description.** Lighthouse CI in PRs needs a deployed preview URL. Coolify supports per-branch deploys but PR preview wiring is TBD.
**Likelihood.** Medium.
**Impact.** Medium — without preview-URL Lighthouse, perf regressions slip past CI.
**Mitigation.** Phase 11 sets up the preview pipeline. Fallback: Lighthouse against a containerized build inside the GitHub Actions runner (slower but no Coolify dependency).

## R-11 — Single VPS production failure (inherits from backend) 🟡

**Raised:** 2026-05-03 (Phase 0)
**Description.** Backend RISKS R-9: single-VPS prod. FE on the same VPS shares the SPOF.
**Likelihood.** Medium.
**Impact.** Medium — full outage if VPS down.
**Mitigation.** Cloudflare in front of FE Caddy/Traefik (CDN edge serves cached homepage / static assets even if origin down). HA roadmap is Phase-2 (post-MVP) per backend `RISKS.md`.

---

## Archived

_(none yet)_
