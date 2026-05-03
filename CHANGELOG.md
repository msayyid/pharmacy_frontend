# Changelog

All notable changes to the Nookat storefront are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Phase 0 deliverables — `MASTER_PLAN.md` with full backend endpoint inventory (33 customer endpoints, ~50 admin endpoints across 10 domains), i18n key inventory, 15 resolved open questions, 11 risks. `OPEN_QUESTIONS.md` with all Phase-0 resolutions + new `OQ-16` for the backend cart-merge endpoint. `DECISION_LOG.md` with the cart-merge workaround entry + 13 architectural defaults. `BUILD_PROGRESS.md` with phase tracker, smoke recipes, and pre-launch backlog.
- Phase 1 — Next.js 16 (App Router) bootstrap at the repo root: TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); Tailwind 4 default install (brand tokens land in Phase 2); ESLint 9 flat config (`@typescript-eslint`, `react`, `react-hooks`, `jsx-a11y`, `@next/next` core-web-vitals); Prettier 3 with `prettier-plugin-tailwindcss`; Husky + lint-staged pre-commit hook.
- Phase 1 — Test scaffolding: Vitest with jsdom + RTL + jest-dom matchers, one sanity unit test; Playwright with three browser projects (chromium, firefox, webkit), one homepage E2E test.
- Phase 1 — `app/api/health/route.ts` returning `{ status: "ok", version }` (hardcoded `0.1.0` for Phase 1; wires to git SHA in Phase 12).
- Phase 1 — Sentry skeleton: `@sentry/nextjs` installed; `sentry.{client,server,edge}.config.ts` + `instrumentation.ts` are no-ops without DSN; full wiring in Phase 11.
- Phase 1 — Multistage `node:20-alpine` Dockerfile with `output: "standalone"`, non-root `nextjs` user, `wget`-based healthcheck on `/api/health`.
- Phase 1 — GitHub Actions CI: parallel `lint | typecheck | test | build` jobs on every PR; chromium-only E2E on PR; full matrix (chromium + firefox + webkit) on push to `main` and `staging`.
- Phase 1 — Persistent state files at root: `MASTER_PLAN.md`, `BUILD_PROGRESS.md`, `DECISION_LOG.md`, `OPEN_QUESTIONS.md`, `RISKS.md`, `CHANGELOG.md` (this file), `AGENTS.md` redirecting to `CLAUDE.md`.

### Changed

- Replaced the `create-next-app` placeholder homepage with a minimal foundation placeholder (no brand styling — Phase 2 introduces brand tokens and the real shell).
- Replaced the bootstrap-generated `CLAUDE.md` (pointer file) with the project's canonical rulebook copied from `/specs/`.

### Notes

- Next.js 16.2.4 + React 19.2.4 + TypeScript 5.9 + Tailwind 4.2 chosen at install time (current latest at 2026-05-03). The `AGENTS.md` warning is preserved verbatim — Next 16 has real differences from prior major versions; Phase 2+ work that touches Next-specific APIs must consult `node_modules/next/dist/docs/`.
- Sentry's `@sentry/cli` postinstall script is intentionally not approved (dev-only, only needed at deploy for sourcemap upload). Phase 11 revisits.
