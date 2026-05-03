# Claude Code Prompts — Nookat Frontend

> Phased build prompts for two Next.js 15 frontends (storefront + admin) consuming the FastAPI backend at https://github.com/msayyid/pharmacy_backend.
>
> Mirrors the discipline of the backend's `CLAUDE_CODE_PROMPTS.md`: each phase has its own prompt, definition of done, and hand-off. Skip phases at your peril — Phase 5 assumes Phase 4 is complete and tested.
>
> **Read order at session start:** `CLAUDE.md` → `BUILD_PROGRESS.md` → this file at the active phase. Re-read the cited spec sections before writing code.

---

## Table of Contents

### Part 1 — How to Use
1. [How to use this document](#1-how-to-use-this-document)
2. [Files you'll maintain](#2-files-youll-maintain)
3. [Operating principles (always-on rules)](#3-operating-principles-always-on-rules)
4. [Tool usage playbook](#4-tool-usage-playbook)

### Part 2 — Bootstrap
- [Phase 0 — Spec comprehension & master plan](#phase-0--spec-comprehension--master-plan)

### Part 3 — Storefront build phases
- [Phase 1 — Project foundation](#phase-1--project-foundation)
- [Phase 2 — Design system implementation](#phase-2--design-system-implementation)
- [Phase 3 — API client + type generation](#phase-3--api-client--type-generation)
- [Phase 4 — i18n foundation](#phase-4--i18n-foundation)
- [Phase 5 — Auth & account](#phase-5--auth--account)
- [Phase 6 — Catalog browse (read-only)](#phase-6--catalog-browse-read-only)
- [Phase 7 — PDP & search](#phase-7--pdp--search)
- [Phase 8 — Cart](#phase-8--cart)
- [Phase 9 — Checkout & order placement](#phase-9--checkout--order-placement)
- [Phase 10 — Order history & detail](#phase-10--order-history--detail)
- [Phase 11 — Hardening: SEO, perf, a11y](#phase-11--hardening-seo-perf-a11y)
- [Phase 12 — Storefront launch readiness](#phase-12--storefront-launch-readiness)

### Part 3b — Admin build phases (parallel after storefront Phase 5)
- [Phase A1 — Admin foundation & login](#phase-a1--admin-foundation--login)
- [Phase A2 — Admin orders queue & picking](#phase-a2--admin-orders-queue--picking)
- [Phase A3 — Admin catalog CRUD](#phase-a3--admin-catalog-crud)
- [Phase A4 — Admin inventory & receive batches](#phase-a4--admin-inventory--receive-batches)
- [Phase A5 — Admin reports](#phase-a5--admin-reports)
- [Phase A6 — Admin audit & launch](#phase-a6--admin-audit--launch)

### Part 4 — Meta-prompts
- [Code review meta-prompt](#code-review-meta-prompt)
- [Debugging meta-prompt](#debugging-meta-prompt)
- [Ambiguity resolution meta-prompt](#ambiguity-resolution-meta-prompt)
- [Context recovery meta-prompt](#context-recovery-meta-prompt)
- [Refactor meta-prompt](#refactor-meta-prompt)
- [API drift recovery meta-prompt](#api-drift-recovery-meta-prompt)

### Part 5 — Templates & what else to add
- [BUILD_PROGRESS.md template](#buildprogressmd-template)
- [DECISION_LOG.md template](#decisionlogmd-template)
- [CHANGELOG.md template](#changelogmd-template)
- [OPEN_QUESTIONS.md template](#openquestionsmd-template)
- [RISKS.md template](#risksmd-template)
- [What else to add as the project matures](#what-else-to-add-as-the-project-matures)

---

# Part 1 — How to Use

## 1. How to use this document

**This file is the script for building Nookat's frontend, phase by phase.**

The pattern: open the active phase, read its prompt, read the cited spec sections in full, fetch the cited backend files, plan in `BUILD_PROGRESS.md`, get plan approval, implement, test, hand off.

### 1.1 The four spec files

You will reference all four constantly:

| File | When to reach for it |
|---|---|
| `/specs/PRODUCT_BLUEPRINT.md` | "What does this feature do? What are the rules?" |
| `/specs/DESIGN_BLUEPRINT.md` | "What does this look like? How does it move?" |
| `/specs/FRONTEND_BLUEPRINT.md` | "How do we build it? What's the architecture?" |
| `/specs/FRONTEND_CLAUDE_CODE_PROMPTS.md` | "What's the next phase? What's the order?" |

Plus `CLAUDE.md` at the project root — the rulebook re-read every session.

### 1.2 The backend repo

Backend is **complete and read-only** at `https://github.com/msayyid/pharmacy_backend` (v1.0.0-rc1). You read from it; you never modify it.

For raw file access:
```
https://raw.githubusercontent.com/msayyid/pharmacy_backend/main/<path>
```

Examples you'll fetch repeatedly:
- `app/api/v1/cart.py` — cart endpoints
- `app/domain/orders/schemas.py` — order/cart/checkout response shapes
- `app/domain/catalog/storefront_schemas.py` — catalog response shapes
- `app/domain/identity/schemas.py` — auth/user/address schemas
- `app/i18n/ru.json` — backend's i18n keys (mirror in frontend)
- `app/core/errors.py` — error codes the frontend resolves to messages

Or run the backend locally:
```bash
git clone https://github.com/msayyid/pharmacy_backend
cd pharmacy_backend
make docker-up
make dev
# → http://localhost:8000
# Swagger at http://localhost:8000/docs (when DEBUG=true)
# OpenAPI at http://localhost:8000/openapi.json
```

### 1.3 Phase shape

Every phase has the same anatomy:

1. **Mission** — one paragraph stating the phase's outcome
2. **Specs to re-read** — exact section numbers, no skim
3. **Backend files to fetch** — paths in the backend repo
4. **Plan-first gate** — write the plan in `BUILD_PROGRESS.md`, post in chat, await approval
5. **Deep-thinking prompts** (where appropriate) — points where extended reasoning helps
6. **Sub-agent suggestions** (where appropriate) — when to fan out
7. **Implementation guidance** — order, traps, hot spots
8. **Test expectations** — what good test coverage looks like for the phase
9. **Out of scope** — explicit fence so the phase stays bounded
10. **Definition of done** — the checklist
11. **Hand-off** — what to write in `BUILD_PROGRESS.md` for the next phase

### 1.4 Plan-first is mandatory

**Never start coding without an approved plan.** The plan goes in `BUILD_PROGRESS.md` under the active phase, and a summary is posted in chat. The user approves; only then do you start.

A plan is:
- The list of files to create or modify (rough order)
- The decisions you've made (route shape, component split, store boundaries)
- The decisions you're deferring (with proposed defaults)
- The risks you see
- The test plan
- A time/scope estimate

Plans should be 1-page-ish — long enough to be useful, short enough to read.

### 1.5 The mantra

> **Read specs. Plan first. Implement narrowly. Test as you build. Hand off cleanly.**

If you skip any of those, you regret it later.

---

## 2. Files you'll maintain

These five files are the project's persistent memory. Every phase touches them.

### 2.1 `BUILD_PROGRESS.md`

Single source of truth for "what phase, what next, what's blocking." Updated at every phase boundary AND at every meaningful sub-phase. Template in Part 5.

### 2.2 `DECISION_LOG.md`

Append-only record of non-obvious decisions. Every "why this and not that" gets an entry. Template in Part 5.

### 2.3 `CHANGELOG.md`

Keep a Changelog format. User-facing changes only (developers read code; this file is for humans tracking what shipped). Template in Part 5.

### 2.4 `OPEN_QUESTIONS.md`

Unresolved ambiguities + proposed defaults. Closed when answered. Template in Part 5.

### 2.5 `RISKS.md`

Active risks with mitigation status. Template in Part 5.

---

## 3. Operating principles (always-on rules)

These are the rules that don't have a phase. They're true on day one and on day 100.

### 3.1 Specs first

When a phase prompt says "re-read DESIGN §11.3," read **§11.3 in full**. Skimming hides nuance. Scrolling past examples loses calibration.

### 3.2 The backend is the API contract

Never invent a response shape. Fetch the backend file, run `pnpm types:generate`, derive types from there. Mismatches between frontend assumptions and backend reality become P0 bugs in production.

### 3.3 Brand name in two places only

`lib/brand.ts` and `messages/<lang>.json`. Anywhere else is a violation. (See DESIGN §20 for the rename protocol.)

### 3.4 i18n keys are law

Never hardcode user-visible strings. If the key doesn't exist, add it to all three language files in the same commit, then use it.

### 3.5 No marketing scarcity, no medical advice, no fake claims

The three sacred invariants. See `CLAUDE.md > Sacred invariants` for the full list of 10.

### 3.6 Tokens, not raw values

No raw hex, no raw font-size, no raw padding. Always design tokens.

### 3.7 RSC by default; `"use client"` is justified

Server Components are the default. Adding `"use client"` is a deliberate choice and gets a comment explaining why.

### 3.8 Verification gate before "complete"

Before claiming a phase complete: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm types:check`, manual page render check, smoke recipe run. All green or the phase isn't done.

### 3.9 Phone is one tap away

In every error state, every order confirmation, every checkout step. The customer support phone CTA. Always.

### 3.10 Test as you build

Component → component test in the same commit. Page → E2E test in the next commit. No "tests in Phase 11" — Phase 11 is hardening, not retrofitting tests.

---

## 4. Tool usage playbook

### 4.1 Deep thinking (extended reasoning)

**Use it when:**
- Designing the auth refresh flow (silent retry, race conditions, in-flight dedup)
- Tracing a hydration mismatch
- Choosing between RSC and client component for a flow with mixed concerns
- Considering deviation from a spec
- Designing the cart-merge-on-login behaviour

**Don't use it for:**
- "Should I use TanStack Query here?" (yes, if it's server state)
- "Should this be a server component?" (yes, if it doesn't need interactivity)
- "Where does this i18n key go?" (the answer is in DESIGN §18)

### 4.2 Sub-agents (parallel work via Task tool)

**Use them when:**
- A phase spans 6+ disjoint files (e.g., "build all 8 product-domain components")
- You need to read large parts of the backend code base in one shot
- Two parts of the work touch different concerns and don't share state

**Pattern:**
- 5–8 files per agent, 1 agent per concern
- Each agent gets the spec sections relevant to its slice
- Coordinator (you) reviews each agent's diff before merging

**Don't use them for:**
- Sequential work (build A, then B)
- Anything touching the same file
- Quick fixes (overhead exceeds benefit)

### 4.3 Web search

**Use it when:**
- A library version may have changed since training (Next.js 15.x, TanStack Query v5.x, next-intl 3.x, shadcn/ui, Tailwind 4)
- An error message hints at a known issue
- You're integrating something new and want current canonical patterns
- You hit a Next.js App Router edge case

**Don't use it for:**
- Pharmacy domain rules (use specs)
- Backend API contracts (fetch the backend file)

### 4.4 Plan mode / TodoWrite

Start every phase with `TodoWrite`. Break into 6–15 trackable items. Mark items complete as you go. The phase ends when the list is empty.

### 4.5 Reading vs running

Reading code tells you what it claims to do. Running code tells you what it actually does. Always run.

For pages: `pnpm dev` and hit the page in a browser.
For components: write the component test and watch it pass.
For E2E: `pnpm e2e` and watch the trace.

The phrase "this should work" is forbidden in completion claims.

---

# Part 2 — Bootstrap

## Phase 0 — Spec comprehension & master plan

> **Mission.** Read every spec, fetch every relevant backend file, build a master plan, surface every open question. No code in this phase. The output is shared understanding.
>
> **Why this phase exists.** It is cheaper to spend two sessions reading than to spend a week implementing the wrong thing. The backend is 33,866 lines across 212 files — you don't memorize it, but you map it.

### 0.1 The prompt

> You are starting Phase 0. No code yet — this phase is comprehension.
>
> Read in order:
>
> 1. **`CLAUDE.md`** — the project rulebook. Internalize the operating principles, sacred invariants, hard prohibitions, and the file-layout rules.
> 2. **`/specs/PRODUCT_BLUEPRINT.md`** — entire file. Pay attention to §3 product principles, §4 personas, §7 customer journeys, §8 feature catalog, §16 i18n strategy, §21 critical i18n keys, §22 events, §23 phasing.
> 3. **`/specs/DESIGN_BLUEPRINT.md`** — entire file. The 21 sections.
> 4. **`/specs/FRONTEND_BLUEPRINT.md`** — entire file. The 24 sections.
> 5. **This file** — Part 1 (How to Use), the full table of phases, and Part 4 (Meta-prompts). Skim Part 5 (Templates).
>
> Then **read the backend** at `https://github.com/msayyid/pharmacy_backend`. Specifically fetch and read:
>
> - **README.md** — get the lay of the land
> - **CLAUDE.md** (root) — see how the backend organized its rulebook; useful contrast
> - **specs/PRODUCT_BLUEPRINT.md** — same product spec we have, but read it from the backend's copy too in case it has drifted
> - **app/main.py** — middleware, lifespan, router wiring
> - **app/core/config.py** — settings, defaults, env var names
> - **app/core/errors.py** — every error code the backend can emit (the frontend resolves these to i18n keys)
> - **app/api/deps.py** — dependency injection (auth deps, branch resolver, cart owner)
> - **app/api/v1/*.py** — every customer endpoint (auth, account, products, categories, symptoms, search, cart, checkout, me_orders, branches)
> - **app/api/v1/router.py** — which sub-routers are mounted
> - **app/api/admin_v1/router.py** — same for admin
> - **app/api/admin_v1/auth.py, orders.py, products.py** — sample admin endpoints to size the admin work
> - **app/domain/catalog/storefront_schemas.py** — every shape the storefront consumes
> - **app/domain/identity/schemas.py** — auth, user, address shapes
> - **app/domain/orders/schemas.py** — cart, checkout, order shapes
> - **app/domain/identity/dependencies.py** — how auth deps work, what the JWT contract is
> - **app/i18n/ru.json** + **app/i18n/ky.json** + **app/i18n/en.json** — every key the backend defines (the frontend mirrors these)
> - **BUILD_PROGRESS.md** + **DECISION_LOG.md** + **OPEN_QUESTIONS.md** + **RISKS.md** + **LAUNCH_CHECKLIST.md** — backend's persistent state files; you'll mirror this discipline
>
> While reading, capture two things:
>
> 1. **Endpoint inventory** — every customer endpoint with method, path, request body shape, response shape, status codes. Same for admin (lighter — you'll go deeper before Phase A1).
> 2. **i18n key inventory** — every key the backend defines, grouped by family.
>
> Then start the backend locally to verify your reading:
>
> ```bash
> git clone https://github.com/msayyid/pharmacy_backend ~/pharmacy_backend
> cd ~/pharmacy_backend
> make docker-up
> make dev
> ```
>
> Open `http://localhost:8000/docs` (Swagger UI). Click through every endpoint group. Hit `GET /api/v1/categories` — you should get a JSON tree. Hit `POST /api/v1/auth/otp/request` with a test phone — note the OTP code logged to the uvicorn output (search for `sms_enqueued`).
>
> If anything in your reading contradicts the live API, the live API wins. Update your inventory.
>
> Now produce the **Master Plan** — the deliverable for Phase 0. Format below. Post it in chat AND save as `MASTER_PLAN.md` at the project root.

### 0.2 Master Plan format

```markdown
# Master Plan — Nookat Frontend

## Reading completed
- [x] CLAUDE.md
- [x] PRODUCT_BLUEPRINT.md (all sections)
- [x] DESIGN_BLUEPRINT.md (all sections)
- [x] FRONTEND_BLUEPRINT.md (all sections)
- [x] FRONTEND_CLAUDE_CODE_PROMPTS.md (Part 1, phase TOC, Part 4)
- [x] backend/README.md
- [x] backend/CLAUDE.md
- [x] backend/app/main.py + core/config.py + core/errors.py + api/deps.py
- [x] all customer endpoints (app/api/v1/*.py)
- [x] all storefront schemas
- [x] backend i18n files (ru/ky/en)
- [x] backend persistent state files

## Customer endpoint inventory

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| POST | /api/v1/auth/otp/request | `{phone}` | `{sent, expires_in_seconds}` | rate-limited |
| POST | /api/v1/auth/otp/verify | `{phone, code}` | `TokenPairOut` | auto-creates user |
| POST | /api/v1/auth/refresh | `{refresh_token}` | `TokenPairOut` | rotates jti |
| POST | /api/v1/auth/logout | `{refresh_token}` | 204 | revokes |
| GET | /api/v1/me | — | `UserMeRead` | auth required |
| ... fill in completely ... |

## Admin endpoint inventory (high-level)

| Domain | Endpoints | Notes |
|---|---|---|
| Auth | login, logout, me | session cookie |
| Manufacturers | CRUD | |
| ... |

## i18n key inventory

| Family | Backend keys | Frontend will add |
|---|---|---|
| auth.otp.* | title, send_button, sent, code_label, verify_button, invalid, too_many | login.heading, login.cta |
| cart.* | empty.title, empty.cta, out_of_stock, price_changed | cart.subtotal_label, cart.totals.* |
| ... |

## Open questions surfaced

1. **(Q1) Branch picker UX.** Backend hardcodes `branch_id=1` for storefront reads (PRODUCT roadmap Phase 2). Confirm: storefront also hardcodes for MVP, no UI affordance. Default: yes, single branch shown in footer + About.
2. **(Q2) Card payment redirect handling.** Backend's place-order returns `payment_redirect_url` for `card_online`. We `window.location.assign()` it. Confirm: no embedded iframe.
3. **(Q3) PWA scope.** Spec doesn't mandate PWA in MVP. Default: ship a manifest + favicons, no service worker.
4. ... add 5–10 more as you find them ...

## Architectural decisions confirmed (from FRONTEND_BLUEPRINT)

- Two repos, not monorepo
- Coolify on same VPS as backend
- next-intl for i18n
- TanStack Query v5
- shadcn/ui copy-paste
- ...

## Phase order (12 storefront + 6 admin)

| Phase | Goal | Estimated sessions |
|---|---|---|
| 0 | Spec comprehension | 1 |
| 1 | Project foundation | 1 |
| 2 | Design system | 1–2 |
| ... |

## Risks surfaced

1. **(R1) Backend OTP flow uses fake SMS in dev.** OTP code logs to backend stdout. We need this clearly documented in our test setup.
2. **(R2) Brand-name rename later.** We commit to the discipline; spot-check at every code review.
3. ...

## Definition of Done for Phase 0

- [x] All four spec files read in full (with section numbers cited in Master Plan)
- [x] Backend repo cloned + at least every file in §0.1 list read
- [x] Backend runs locally; Swagger UI explored
- [x] Endpoint inventory complete (90%+ coverage)
- [x] i18n key inventory complete
- [x] 8+ open questions surfaced with proposed defaults
- [x] Phase order confirmed
- [x] Risks listed
```

### 0.3 Definition of Done

- [ ] All spec files read end-to-end (no skimming)
- [ ] Backend repo cloned, runs locally, Swagger explored
- [ ] Customer endpoint inventory: every endpoint listed with method, path, request, response
- [ ] Admin endpoint inventory: high-level grouping (full inventory at start of Phase A1)
- [ ] i18n key inventory: every backend key cataloged
- [ ] 8–15 open questions surfaced with proposed defaults in `MASTER_PLAN.md`
- [ ] Phase order confirmed (deviations from this document explicitly justified)
- [ ] Risks list with mitigation strategy
- [ ] `MASTER_PLAN.md` committed to the project root
- [ ] One-paragraph Phase 0 summary posted in chat with the questions for the user

### 0.4 Hand-off

Update `BUILD_PROGRESS.md`:

```markdown
## Current state
- **Active phase:** Phase 0 — Spec Comprehension & Master Plan
- **Status:** complete
- **Last session:** YYYY-MM-DD
- **Next session should:** read `MASTER_PLAN.md` and confirm the open questions are answered before starting Phase 1.

## Phases
- [x] Phase 0 — Spec Comprehension & Master Plan _(done YYYY-MM-DD)_
- [ ] Phase 1 — Project Foundation
- [ ] Phase 2 — Design System Implementation
- ... rest pending
```

In chat, post: master plan summary + the open questions list + your recommendation on each + "ready for Phase 1 once these are confirmed."

---

# Part 3 — Storefront Build Phases

## Phase 1 — Project foundation

> **Mission.** A green Next.js 15 storefront skeleton: builds, lints, type-checks, runs `pnpm dev`, ships to a Docker image. No features yet — just the runway.

### 1.1 Specs to re-read

- `FRONTEND_BLUEPRINT §2` (tech stack), `§4` (storefront directory structure), `§21` (code conventions), `§22` (build/deploy/environments), `§24` (conventions checklist)
- `CLAUDE.md > Tech stack reality checks` and `> Operating principles`

### 1.2 Backend files to fetch

- `Dockerfile` — see how the backend structured its multistage build (we'll mirror the pattern for our Node-based image)
- `.env.example` — see what env vars we'll need to consume (`API_URL`, `CORS_ORIGINS`)

### 1.3 Plan-first gate

Write the plan in `BUILD_PROGRESS.md > Phase 1`. Post summary in chat. Wait for approval.

The plan should answer:
- pnpm vs npm vs yarn (recommendation: **pnpm**, faster, content-addressable, fits Coolify caching)
- Node version (recommendation: **20 LTS**)
- Repo: new vs existing (assume new — `nookat-storefront`)
- Initial route shape (will be `/[locale]/page.tsx` after Phase 4; for Phase 1, just `/page.tsx` placeholder)
- Husky / lint-staged config
- ESLint flat config vs legacy (recommendation: **flat config**, ESLint 9+)
- Prettier with `prettier-plugin-tailwindcss`
- CI: GitHub Actions matrix (`lint, typecheck, test, build`)
- Sentry skeleton: install `@sentry/nextjs` but DSN unset; init runs no-op

### 1.4 Implementation guidance

#### 1.4.1 Bootstrap the project

```bash
pnpm create next-app@latest nookat-storefront \
  --typescript --tailwind --app --src-dir false --import-alias "@/*" \
  --turbo --no-eslint
cd nookat-storefront
```

(`--no-eslint` because we'll set up flat config ourselves; `--src-dir false` keeps `app/` at root.)

#### 1.4.2 Install core deps (not all features yet)

```bash
pnpm add zod
pnpm add -D @types/node @types/react @types/react-dom
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y eslint-plugin-tailwindcss
pnpm add -D prettier prettier-plugin-tailwindcss
pnpm add -D husky lint-staged
pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @playwright/test
pnpm add -D @axe-core/playwright
pnpm add @sentry/nextjs
```

#### 1.4.3 Configure `tsconfig.json` strict

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

#### 1.4.4 ESLint flat config

`eslint.config.js` with `@typescript-eslint`, `react`, `react-hooks`, `jsx-a11y`, `tailwindcss` plugins. Critical rules:
- `@typescript-eslint/no-explicit-any: error`
- `@typescript-eslint/consistent-type-imports: error`
- `react/jsx-no-target-blank: error`
- `jsx-a11y/anchor-is-valid: error`
- `tailwindcss/classnames-order: warn`

#### 1.4.5 Prettier + Tailwind sort

```js
// prettier.config.cjs
module.exports = {
  plugins: ["prettier-plugin-tailwindcss"],
  printWidth: 100,
  semi: false,
  singleQuote: false,
  trailingComma: "all",
}
```

#### 1.4.6 Husky + lint-staged

```bash
pnpm exec husky init
echo "pnpm exec lint-staged" > .husky/pre-commit
```

`package.json`:
```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

#### 1.4.7 Vitest + Playwright skeleton

`vitest.config.ts` with jsdom env. One placeholder unit test (`tests/unit/sanity.test.ts` checking `1 + 1 === 2`) so CI has something to run.

`playwright.config.ts` with one placeholder E2E (homepage 200) — runs against `pnpm dev` started by Playwright's webServer.

#### 1.4.8 Sentry init (no-op without DSN)

Use the official Sentry Next.js wizard (`pnpm dlx @sentry/wizard@latest -i nextjs`). Confirm `sentry.client.config.ts` and `sentry.server.config.ts` exist and reference `SENTRY_DSN` env. With no DSN set, init is a no-op.

#### 1.4.9 Dockerfile (multistage)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

`next.config.ts`: `output: "standalone"`.

Add `app/api/health/route.ts` returning `{ status: "ok", version: pkg.version }`.

#### 1.4.10 GitHub Actions

`.github/workflows/ci.yml`:
- Trigger: `push` to `main` and `staging`, plus `pull_request`
- Jobs: `lint`, `typecheck`, `test`, `build` (parallel)
- Each: `pnpm install --frozen-lockfile`, then the specific step
- Cache: pnpm store

#### 1.4.11 `.env.example`

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BRAND_NAME=Nookat
NEXT_PUBLIC_DEFAULT_LOCALE=ru
API_URL=http://localhost:8000
SENTRY_DSN=
NODE_ENV=development
```

#### 1.4.12 Persistent state files

Create at root: `CLAUDE.md` (copy from `/specs/`), `BUILD_PROGRESS.md`, `DECISION_LOG.md`, `CHANGELOG.md`, `OPEN_QUESTIONS.md`, `RISKS.md` — using the templates in Part 5.

### 1.5 Test expectations

- Unit: 1 sanity test (`1 + 1 === 2`)
- E2E: 1 homepage test (200 + page contains expected placeholder text)
- All commands clean: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`

### 1.6 Out of scope for this phase

- Brand tokens (Phase 2)
- Component library (Phase 2)
- API client (Phase 3)
- i18n (Phase 4)
- Any actual feature

### 1.7 Definition of Done

- [ ] `pnpm install` clean
- [ ] `pnpm dev` serves homepage with placeholder text on `:3000`
- [ ] `pnpm lint` clean
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` passes (1 unit test)
- [ ] `pnpm e2e` passes (1 homepage test)
- [ ] `pnpm build` succeeds
- [ ] `docker build .` produces an image; `docker run -p 3000:3000 <image>` serves the same homepage
- [ ] `/api/health` returns `{ status: "ok", version }`
- [ ] CI runs all checks on PR
- [ ] All persistent state files (`CLAUDE.md`, `BUILD_PROGRESS.md`, etc.) at root
- [ ] Phase 1 commit pushed; tag suggestion `v0.1.0`

### 1.8 Hand-off

`BUILD_PROGRESS.md`:

```markdown
- [x] Phase 1 — Project Foundation _(done YYYY-MM-DD; commit <SHA>)_
- [ ] Phase 2 — Design System Implementation
```

In chat: confirm green build + Docker image + CI passing. List any deferred items (e.g., "Sentry DSN unset — will configure in Phase 11"). Recommend Phase 2 next.

---

## Phase 2 — Design system implementation

> **Mission.** Translate `DESIGN_BLUEPRINT.md` into code: brand tokens as CSS variables, Tailwind theme extending them, the placeholder Nookat logo, base shadcn primitives customized to brand, and the brand discipline files (`lib/brand.ts` + `public/brand/*`).

### 2.1 Specs to re-read

- `DESIGN_BLUEPRINT §1` (brand foundation), `§4` (color), `§5` (typography), `§6` (spacing), `§7` (icons), `§9` (elevation/borders/radius), `§10` (motion), `§11` (component library), `§20` (brand-rename protocol), `§21` (conventions checklist)
- `FRONTEND_BLUEPRINT §4` (directory structure)

### 2.2 Backend files to fetch

None for this phase — design is local concern.

### 2.3 Plan-first gate

Plan in `BUILD_PROGRESS.md`. Decisions to capture:
- Variable naming convention (`--brand-500` vs `--color-brand-500` — pick one and stay consistent)
- shadcn install pattern (init + add components one at a time vs bulk)
- Logo placeholder generation approach (inline SVG in `public/brand/`, drawn programmatically)
- Font loading via `next/font` (subset Cyrillic + Latin)
- Class names exposed via Tailwind (e.g., `bg-brand-500`, `text-ink-900`)

### 2.4 Implementation guidance

#### 2.4.1 `lib/brand.ts`

```ts
export const BRAND = {
  name: "Nookat",
  nameLocalized: { ru: "Ноокат", ky: "Ноокат", en: "Nookat" },
  tagline: { ru: "Аптека, которой доверяют", ky: "Ишеничтүү аптека", en: "The pharmacy people trust" },
  domain: "nookat.kg",
  supportPhone: "+996 XXX XX XX XX", // real phone goes here at launch
  licenseNumber: "№XXXXX",            // real license number
  address: {
    ru: "г. Ноокат, Ошская область, Кыргызстан",
    ky: "Ноокат шаары, Ош облусу, Кыргызстан",
    en: "Nookat, Osh region, Kyrgyzstan",
  },
} as const

export type BrandConfig = typeof BRAND
```

#### 2.4.2 Brand placeholder logo

Generate four SVGs in `public/brand/`:
- `logo-horizontal.svg` — pill mark + "Nookat" wordmark inline
- `logo-mark.svg` — pill mark only (favicons, mobile nav)
- `logo-mono.svg` — single-color version
- `logo-on-dark.svg` — for dark surfaces (footer if/when needed)

Drawing: a tilted capsule (one half slightly longer; not symmetric — feels human, not corporate) in `--brand-500`, plus the wordmark in DM Serif Display (or Inter 600 if the serif is too much for placeholder).

#### 2.4.3 `app/globals.css` — brand tokens

Mirror DESIGN §4–10 exactly. Every CSS variable from those sections lands in `globals.css`:

```css
@layer base {
  :root {
    /* Brand */
    --brand-50: #EEF5FB;
    --brand-100: #D6E7F4;
    /* ... full §4.2 table ... */
    --brand-500: #1A6FB0;
    /* ... */

    /* Ink (warm neutrals) */
    --ink-50: #F7F8F9;
    /* ... full §4.3 table ... */

    /* Surfaces */
    --surface-base: #FAFBFC;
    --surface-card: #FFFFFF;
    --surface-sunken: #F2F4F6;
    --surface-tint: #F4F8FB;

    /* Semantic */
    --success-500: #2E7D54;
    --warning-500: #B97A12;
    --danger-500: #B73448;
    /* ... */

    /* Pharmacy-specific */
    --stock-in: var(--success-500);
    --stock-out: var(--danger-500);
    --rx-flag: #7B5BAB;
    --cold-chain: #0E7C8C;

    /* Spacing */
    --space-1: 4px;
    /* ... full §6.1 table ... */

    /* Type scale */
    --text-display: 32px;
    /* ... full §5.2 mobile values ... */

    /* Radius */
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --radius-xl: 20px;
    --radius-pill: 9999px;

    /* Elevation */
    --elev-1: 0 1px 2px rgba(15, 17, 21, 0.04), 0 1px 1px rgba(15, 17, 21, 0.03);
    /* ... §9.1 table ... */

    /* Motion */
    --duration-instant: 80ms;
    --duration-quick: 160ms;
    --duration-base: 240ms;
    --duration-slow: 360ms;
    --duration-deliberate: 500ms;
    --ease-standard: cubic-bezier(0.2, 0, 0, 1);
    --ease-emphasized: cubic-bezier(0.3, 0, 0, 1);
  }

  @media (min-width: 1024px) {
    :root {
      --text-display: 48px;
      --text-h1: 36px;
      --text-h2: 28px;
      /* ... desktop overrides ... */
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :root {
      --duration-instant: 0ms;
      --duration-quick: 0ms;
      --duration-base: 0ms;
      --duration-slow: 0ms;
      --duration-deliberate: 0ms;
    }
  }

  html {
    color: var(--ink-900);
    background: var(--surface-base);
    font-family: var(--font-inter), -apple-system, system-ui, sans-serif;
    font-feature-settings: "tnum" 1; /* tabular nums by default */
  }
}
```

#### 2.4.4 `tailwind.config.ts` — extend with brand tokens

```ts
import type { Config } from "tailwindcss"

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--brand-50)",
          /* ... full ladder ... */
          500: "var(--brand-500)",
          /* ... */
        },
        ink: { /* ... */ },
        surface: {
          base: "var(--surface-base)",
          card: "var(--surface-card)",
          sunken: "var(--surface-sunken)",
          tint: "var(--surface-tint)",
        },
        success: { 500: "var(--success-500)", 100: "var(--success-100)" },
        warning: { 500: "var(--warning-500)", 100: "var(--warning-100)" },
        danger: { 500: "var(--danger-500)", 100: "var(--danger-100)" },
      },
      fontSize: {
        display: ["var(--text-display)", { lineHeight: "1.1", fontWeight: "600" }],
        h1: ["var(--text-h1)", { lineHeight: "1.15", fontWeight: "600" }],
        /* ... */
      },
      spacing: {
        /* map --space-* to Tailwind keys */
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        elev1: "var(--elev-1)",
        elev2: "var(--elev-2)",
        /* ... */
      },
      transitionDuration: {
        quick: "var(--duration-quick)",
        base: "var(--duration-base)",
        /* ... */
      },
    },
  },
} satisfies Config
```

#### 2.4.5 Fonts via `next/font`

```ts
// app/layout.tsx
import { Inter, JetBrains_Mono, DM_Serif_Display } from "next/font/google"

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
})
const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap",
})
```

#### 2.4.6 shadcn init

```bash
pnpm dlx shadcn@latest init
```

Choose:
- Style: `new-york` (clean, fits clinical aesthetic)
- Base color: ignore the default — we use our own tokens
- CSS variables: yes
- Components install dir: `components/ui`

Then add the primitives we'll need across phases (per DESIGN §11.2):

```bash
pnpm dlx shadcn@latest add button input label badge card dialog sheet dropdown-menu tabs toast tooltip avatar skeleton separator select checkbox radio-group switch
```

After install, **customize** each component to use OUR tokens (replace shadcn's `bg-primary` with `bg-brand-500`, etc.). This is one-time work; future updates to shadcn upstream are merged manually.

#### 2.4.7 Pharmacy-specific composed components (skeleton)

Create skeleton files (with prop signatures + TODO bodies) for:
- `components/product/StockPip.tsx`
- `components/product/PriceTag.tsx`
- `components/feedback/EmptyState.tsx`
- `components/feedback/ErrorState.tsx`
- `components/support/PhoneCallButton.tsx`

Each just needs a typed prop interface and a placeholder body so Phases 6–9 can fill them in.

#### 2.4.8 Storybook? No — visual review via dev pages

We don't ship Storybook in MVP (overhead). Instead, create `app/(dev)/_kitchen-sink/page.tsx` (gitignored from production via `next.config.ts` rewrites) — a page that renders every component variant. Use it for visual review during development.

### 2.5 Sub-agent suggestion

If you have many shadcn components to customize, fan out:
- Agent A: Button, Input, Label, Badge customization
- Agent B: Card, Dialog, Sheet, Toast customization
- Agent C: Tabs, Tooltip, Dropdown, Select customization
- Agent D: Pharmacy composed components (StockPip, PriceTag, EmptyState skeletons)

Each agent gets DESIGN §11 + the brand tokens + the customization rule (replace shadcn defaults with our tokens).

### 2.6 Test expectations

- Unit tests for any brand utility functions (e.g., `formatPrice` from `lib/format/price.ts` if you build it now — though this might wait for Phase 4 i18n)
- Component tests for `Button` variants (primary/secondary/ghost/destructive, sizes, disabled, loading)
- One visual regression test per breakpoint on the kitchen-sink page

### 2.7 Out of scope

- Real product photography (Phase 6+)
- i18n message files (Phase 4)
- API client (Phase 3)
- Layout shells (Header/Footer come in Phase 6)

### 2.8 Definition of Done

- [ ] `globals.css` has all DESIGN §4–10 tokens
- [ ] `tailwind.config.ts` exposes brand classes (`bg-brand-500`, etc.)
- [ ] `next/font` Inter + JetBrains Mono + DM Serif loaded with Cyrillic subsets
- [ ] `lib/brand.ts` is the only source of brand name/tagline/contact
- [ ] `public/brand/` has 4 placeholder SVGs
- [ ] shadcn primitives (~17) installed and customized to brand tokens
- [ ] Pharmacy composed components have skeleton files with typed props
- [ ] Kitchen-sink page renders all primitives at all breakpoints
- [ ] Component tests cover Button + Input variants
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` clean
- [ ] No raw hex / no raw px / no raw "Nookat" string in any component file (grep verification)

### 2.9 Hand-off

`BUILD_PROGRESS.md` checks off Phase 2. In chat: paste a screenshot of the kitchen-sink page, list which shadcn customizations were non-trivial, recommend Phase 3 next.

---

## Phase 3 — API client + type generation

> **Mission.** A typed, error-aware HTTP client wired to the backend's OpenAPI spec, with auth-aware variants for RSC and client. CI fails on type drift.

### 3.1 Specs to re-read

- `FRONTEND_BLUEPRINT §6` (backend API integration), `§7` (type generation), `§14` (error handling), `§15` (caching strategy), `§19` (observability)
- `CLAUDE.md > Tech stack reality checks > Backend is complete and read-only`

### 3.2 Backend files to fetch

- `app/main.py` — confirm middleware stack, OpenAPI generation
- `app/core/errors.py` — every error code (`validation_error`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `out_of_stock`, `rate_limited`, `idempotency_conflict`, etc.)
- `app/api/errors.py` — RFC 7807 ProblemDetails handler shape
- `app/core/config.py` — confirm `cors_origins` is settable
- The full `${API_URL}/openapi.json` — fetch and inspect

### 3.3 Plan-first gate

Plan in `BUILD_PROGRESS.md`. Decisions to capture:
- Code-gen tool: `openapi-typescript` (types) + `openapi-fetch` (runtime client) — confirm
- Where generated artifacts live: `generated/api.d.ts`, checked in
- Pre-commit hook for `types:check` — yes
- CI gate: PR fails if `types:check` fails — yes
- Error class shape: `ApiError extends Error` with `code`, `status`, `context`
- RSC fetcher vs client fetcher — same wrapper, different cookie/header handling
- Sentry breadcrumbs on every API call — yes
- Request ID generation: per-request UUID via `crypto.randomUUID()` — yes

### 3.4 Implementation guidance

#### 3.4.1 Install

```bash
pnpm add openapi-fetch
pnpm add -D openapi-typescript
```

#### 3.4.2 Type generation script

`package.json`:
```json
{
  "scripts": {
    "types:generate": "openapi-typescript ${API_URL:-http://localhost:8000}/openapi.json -o generated/api.d.ts",
    "types:check": "git diff --exit-code generated/api.d.ts || (echo '⚠️  API types out of date — run pnpm types:generate' && exit 1)"
  }
}
```

CI step:
```yaml
- run: pnpm types:check
```

This requires the backend to be reachable in CI (or a checked-in `openapi.json` snapshot — recommend snapshotting on every backend release tag).

**Pragmatic alternative for CI:** check in `openapi.json` alongside `generated/api.d.ts`. Update both on backend bumps. CI verifies `openapi.json → api.d.ts` round-trip is stable.

#### 3.4.3 First generation

```bash
pnpm types:generate
git add generated/api.d.ts openapi.json
git commit -m "feat(api): generate types from backend@v1.0.0-rc1"
```

#### 3.4.4 Type aliases

`lib/api/types.ts`:
```ts
import type { components, paths } from "@/generated/api"

// Friendly aliases
export type ProductDetail = components["schemas"]["StorefrontProductDetail"]
export type ProductCard = components["schemas"]["StorefrontProductCard"]
export type ProductsPage = components["schemas"]["StorefrontProductsPage"]
export type CategoryNode = components["schemas"]["CategoryNode"]
export type CategoryDetail = components["schemas"]["CategoryDetail"]
export type Symptom = components["schemas"]["StorefrontSymptom"]
export type Branch = components["schemas"]["StorefrontBranch"]
export type SearchResults = components["schemas"]["SearchResultPage"]
export type SuggestResponse = components["schemas"]["SuggestResponse"]

export type CartRead = components["schemas"]["CartRead"]
export type CartItemRead = components["schemas"]["CartItemRead"]
export type CheckoutQuote = components["schemas"]["CheckoutQuoteResponse"]
export type PlaceOrderResponse = components["schemas"]["PlaceOrderResponse"]
export type OrderRead = components["schemas"]["OrderRead"]
export type OrderListItem = components["schemas"]["OrderListItem"]
export type OrderStatusRead = components["schemas"]["OrderStatusRead"]
export type ReorderResponse = components["schemas"]["ReorderResponse"]

export type UserMe = components["schemas"]["UserMeRead"]
export type Address = components["schemas"]["AddressRead"]
export type TokenPair = components["schemas"]["TokenPairOut"]

// Path types for openapi-fetch
export type Paths = paths
```

#### 3.4.5 ApiError class

`lib/api/errors.ts`:
```ts
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public context: Record<string, unknown> = {},
    public requestId?: string,
  ) {
    super(`[${status}] ${code}`)
    this.name = "ApiError"
  }
}

interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  code?: string
  context?: Record<string, unknown>
}

export async function parseApiError(response: Response): Promise<ApiError> {
  let body: ProblemDetails | null = null
  try {
    body = (await response.json()) as ProblemDetails
  } catch {
    /* non-JSON body */
  }
  return new ApiError(
    body?.code ?? "unknown_error",
    response.status,
    body?.context ?? {},
    response.headers.get("x-request-id") ?? undefined,
  )
}
```

#### 3.4.6 Server-side fetcher (RSC)

`lib/api/server.ts`:
```ts
import "server-only"
import createClient from "openapi-fetch"
import type { paths } from "@/generated/api"
import { cookies, headers } from "next/headers"
import { parseApiError, ApiError } from "./errors"

const baseUrl = process.env.API_URL ?? "http://localhost:8000"

export function createServerApiClient(opts?: { withAuth?: boolean }) {
  const client = createClient<paths>({ baseUrl })

  client.use({
    async onRequest({ request }) {
      // Forward Accept-Language from incoming request (locale-aware)
      const acceptLanguage = (await headers()).get("accept-language")
      if (acceptLanguage) request.headers.set("Accept-Language", acceptLanguage)

      // X-Request-ID for trace correlation
      request.headers.set("X-Request-ID", crypto.randomUUID())

      // Optional: forward access token from cookie (set by route handler post-OTP)
      if (opts?.withAuth) {
        const token = (await cookies()).get("nookat_access_hint")?.value
        if (token) request.headers.set("Authorization", `Bearer ${token}`)
      }

      return request
    },
    async onResponse({ response }) {
      if (!response.ok) throw await parseApiError(response.clone())
      return response
    },
  })

  return client
}
```

> **Note on access tokens in RSC.** The "real" access token lives in client memory (Zustand). RSC pages can't read it. We use a *hint* cookie (short-lived, mirrored after OTP verify) for RSC-side auth on user-specific reads (`/me`, `/me/orders`). For the storefront's read-mostly RSC surface, this is rarely needed — most catalog reads are unauthenticated. Document this trade-off.

#### 3.4.7 Client-side fetcher

`lib/api/client.ts`:
```ts
"use client"
import createClient from "openapi-fetch"
import type { paths } from "@/generated/api"
import { useAuthStore } from "@/lib/auth/store"
import { parseApiError } from "./errors"
import { refreshAccessToken } from "@/lib/auth/refresh"

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export const apiClient = createClient<paths>({ baseUrl, credentials: "include" })

apiClient.use({
  async onRequest({ request }) {
    const token = useAuthStore.getState().accessToken
    if (token && !request.url.includes("/auth/")) {
      request.headers.set("Authorization", `Bearer ${token}`)
    }
    request.headers.set("X-Request-ID", crypto.randomUUID())
    return request
  },
  async onResponse({ response, request }) {
    if (response.status === 401 && !request.url.includes("/auth/")) {
      // single-flight refresh
      const newToken = await refreshAccessToken()
      if (newToken) {
        request.headers.set("Authorization", `Bearer ${newToken}`)
        return fetch(request)
      }
    }
    if (!response.ok) throw await parseApiError(response.clone())
    return response
  },
})
```

#### 3.4.8 Health check usage

Quick smoke test — `app/api/_diag/route.ts` (gitignored from production):
```ts
import { createServerApiClient } from "@/lib/api/server"
export async function GET() {
  const client = createServerApiClient()
  const { data } = await client.GET("/health" as any)
  return Response.json({ ok: true, backend: data })
}
```

Hit `http://localhost:3000/api/_diag` — confirms the wire is connected.

#### 3.4.9 Env validation

`lib/env.ts`:
```ts
import { z } from "zod"
const Schema = z.object({
  API_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_BRAND_NAME: z.string().min(1),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["ru", "ky", "en"]),
  SENTRY_DSN: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]),
})
export const env = Schema.parse(process.env)
```

Imported once at app startup; Zod throws on invalid env.

### 3.5 Test expectations

- Unit tests for `parseApiError` (valid ProblemDetails, malformed body, 5xx, 0-status)
- Unit tests for the request-ID middleware
- Component test: a tiny page that calls `apiClient.GET("/health")` and renders the result; mocked via MSW

### 3.6 Out of scope

- Auth flow itself (Phase 5)
- Sentry integration of breadcrumbs (Phase 11 hardening)
- Caching strategy beyond default (refined per surface in Phases 6–10)

### 3.7 Definition of Done

- [ ] `pnpm types:generate` works against running backend
- [ ] `pnpm types:check` enforced in CI (build fails on drift)
- [ ] `lib/api/types.ts` re-exports friendly aliases for every storefront-relevant type
- [ ] `ApiError` class + `parseApiError` parser
- [ ] Server fetcher (`lib/api/server.ts`) + Client fetcher (`lib/api/client.ts`)
- [ ] Both forward `Accept-Language` and `X-Request-ID`
- [ ] Diagnostic route confirms end-to-end wire
- [ ] Env validated via Zod at startup
- [ ] All quality gates green
- [ ] Updated `DECISION_LOG.md` for trade-offs (e.g., access-token hint cookie)

### 3.8 Hand-off

`BUILD_PROGRESS.md` Phase 3 checked. In chat: paste output of `curl localhost:3000/api/_diag` showing real backend response. Recommend Phase 4 next.

---

## Phase 4 — i18n foundation

> **Mission.** Three-locale routing with next-intl, message files mirroring the backend's i18n shape, locale-aware formatters for price/date/number/phone.

### 4.1 Specs to re-read

- `DESIGN_BLUEPRINT §17` (voice/tone), `§18` (localization specifics)
- `FRONTEND_BLUEPRINT §13` (i18n)
- `PRODUCT_BLUEPRINT §16` (i18n strategy), `§21` (critical i18n keys)

### 4.2 Backend files to fetch

- `app/i18n/ru.json` — every key
- `app/i18n/ky.json` — every key
- `app/i18n/en.json` — every key
- `app/core/i18n.py` — confirm resolver behavior (Accept-Language → locale)

### 4.3 Plan-first gate

Plan in `BUILD_PROGRESS.md`. Decisions:
- Locale URL strategy: **prefix all** (`/ru/...`, `/ky/...`, `/en/...`) with `/` redirecting to `/ru`. Confirms with backend's default-RU resolver.
- Or: prefix-as-needed (RU is no-prefix, others prefixed). Cleaner URLs, more middleware logic. **Decision: prefix all**, simpler and SEO-explicit.
- Message file structure: flat keys like backend's, OR ICU MessageFormat with namespaces. **Decision: flat keys, mirror backend exactly**, plus frontend-only UI keys nested under `ui.*`.
- Locale persistence: cookie `NEXT_LOCALE` for guests, `User.preferred_language` for logged-in.

### 4.4 Implementation guidance

#### 4.4.1 Install

```bash
pnpm add next-intl libphonenumber-js date-fns
```

#### 4.4.2 next-intl setup

`i18n/config.ts`:
```ts
export const locales = ["ru", "ky", "en"] as const
export const defaultLocale = "ru" as const
export type Locale = (typeof locales)[number]
```

`i18n/request.ts`:
```ts
import { getRequestConfig } from "next-intl/server"
import { hasLocale } from "next-intl"
import { locales, defaultLocale } from "./config"

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(locales, requested) ? requested : defaultLocale
  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  }
})
```

`middleware.ts`:
```ts
import createMiddleware from "next-intl/middleware"
import { locales, defaultLocale } from "@/i18n/config"

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
})

export const config = {
  matcher: ["/((?!api|_next|_static|.*\\..*|favicon.ico).*)"],
}
```

#### 4.4.3 Restructure routes under `[locale]`

Move existing `app/page.tsx` to `app/[locale]/page.tsx`. Add `app/[locale]/layout.tsx` that wires next-intl provider and locale-specific HTML lang attribute.

`app/[locale]/layout.tsx`:
```tsx
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { locales } from "@/i18n/config"

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(locales, locale)) notFound()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

#### 4.4.4 Message files

`messages/ru.json` — copy every key from backend's `app/i18n/ru.json`, plus add UI-only keys grouped under namespaces:

```json
{
  "auth.otp.title": "Введите номер телефона",
  "auth.otp.send_button": "Получить код",
  // ... mirror backend's keys exactly ...

  "ui.nav.home": "Главная",
  "ui.nav.categories": "Категории",
  "ui.nav.symptoms": "Симптомы",
  "ui.nav.cart": "Корзина",
  "ui.nav.account": "Аккаунт",
  "ui.cta.add_to_cart": "Добавить в корзину",
  "ui.cta.remove": "Удалить",
  "ui.cta.checkout": "Оформить заказ",
  "ui.cta.continue_shopping": "Продолжить покупки",
  "ui.cta.call_us": "Позвонить",

  "brand.name": "Nookat",
  "brand.tagline": "Аптека, которой доверяют",
  "brand.about": "Аптека в Ноокате, Ошская область"
}
```

Same shape in `ky.json` (Kyrgyz translations) and `en.json` (English).

#### 4.4.5 Locale-aware formatters

`lib/format/price.ts`:
```ts
import type { Locale } from "@/i18n/config"

export function formatPrice(value: number | string, locale: Locale): string {
  const n = typeof value === "string" ? Number(value) : value
  if (locale === "en") {
    return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} KGS`
  }
  // ru / ky use thin space + сом
  return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 }).replaceAll(",", "\u00A0")} сом`
}
```

`lib/format/date.ts`:
```ts
import { format } from "date-fns"
import { ru, ky, enUS } from "date-fns/locale"
import type { Locale } from "@/i18n/config"

const localeMap = { ru, ky, en: enUS }

export function formatDate(date: Date | string, locale: Locale, pattern = "dd.MM.yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, pattern, { locale: localeMap[locale] })
}
```

`lib/format/phone.ts`:
```ts
import { parsePhoneNumberFromString } from "libphonenumber-js"

export function formatPhoneE164(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, "KG")
  return parsed?.isValid() ? parsed.format("E.164") : null
}

export function formatPhoneDisplay(input: string): string {
  const parsed = parsePhoneNumberFromString(input, "KG")
  return parsed?.isValid() ? parsed.formatInternational() : input
}
```

#### 4.4.6 LangSwitcher component

`components/i18n/LangSwitcher.tsx` (client component) — three buttons or dropdown that swaps locale via `useRouter().replace(pathname, { locale: "ky" })`. Persists to cookie via next-intl middleware.

#### 4.4.7 i18n key validator

`scripts/check-i18n.ts`:
- Loads all three message files
- Asserts every key in `ru.json` exists in `ky.json` and `en.json`
- Reports missing keys
- CI runs `pnpm i18n:check`

### 4.5 Test expectations

- Unit tests for every formatter (price RU/KY/EN, date, phone valid/invalid)
- Component test for LangSwitcher (renders three options, swaps locale on click)
- E2E: navigate to `/`, get redirected to `/ru`; click EN switcher, URL becomes `/en/`

### 4.6 Out of scope

- Translating actual content (Phases 6+ add keys as features land)
- Per-user locale preference (Phase 5 — tied to auth)
- Server-side translation in API responses (backend already does this)

### 4.7 Definition of Done

- [ ] `[locale]` routing works; `/` → `/ru`; `/en` and `/ky` resolve
- [ ] `<html lang>` attribute set per locale
- [ ] Message files mirror backend's i18n keys
- [ ] All UI strings used so far go through `useTranslations` / `getTranslations`
- [ ] Formatters work for all three locales
- [ ] LangSwitcher persists choice
- [ ] `pnpm i18n:check` green
- [ ] All quality gates green

### 4.8 Hand-off

`BUILD_PROGRESS.md` Phase 4 checked. Recommend Phase 5 next.

---

## Phase 5 — Auth & account

> **Mission.** OTP login flow, refresh token in HttpOnly cookie via route handler, in-memory access token, /me + /me/addresses CRUD, soft and hard auth gates.

### 5.1 Specs to re-read

- `FRONTEND_BLUEPRINT §8` (auth & sessions), `§9.1` (routing strategy), `§12` (forms)
- `DESIGN_BLUEPRINT §13.3` (phone input), `§13.5` (OTP input), `§12.10` (account pages)
- `PRODUCT_BLUEPRINT §8.1` (auth feature catalog), `§8.3` (addresses)
- `CLAUDE.md > Domain reality checks > Auth flow gates`, `> Phone number format`

### 5.2 Backend files to fetch

- `app/api/v1/auth.py` — every endpoint (otp/request, otp/verify, refresh, logout, register, login)
- `app/api/v1/account.py` — /me, /me/addresses
- `app/domain/identity/schemas.py` — request/response shapes
- `app/domain/identity/dependencies.py` — JWT contract, optional vs required user
- `app/core/security.py` — phone normalization (we mirror its rules)

### 5.3 Plan-first gate

Capture decisions:
- Refresh token storage: HttpOnly cookie set via Next.js route handler (`/api/auth/set-tokens`). The route handler proxies the backend's `/auth/otp/verify` response and sets the cookie at our origin.
- Access token: in-memory Zustand store, no persistence
- Soft gate: middleware allows guests on most routes; hard gate redirects to `/[locale]/auth/otp` on `/account`, `/orders`, `/me/*`
- Single-flight refresh: shared promise across concurrent 401s
- Phone validation: same `libphonenumber-js` with `defaultCountry: "KG"` matching backend's `phonenumbers`

### 5.4 Implementation guidance

#### 5.4.1 Install

```bash
pnpm add zustand react-hook-form @hookform/resolvers
pnpm add -D @types/node-jose
```

#### 5.4.2 Auth Zustand store

`lib/auth/store.ts`:
```ts
import { create } from "zustand"
import type { UserMe } from "@/lib/api/types"

interface AuthState {
  accessToken: string | null
  user: UserMe | null
  setTokens: (access: string, expiresIn: number) => void
  setUser: (user: UserMe | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setTokens: (access) => set({ accessToken: access }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}))
```

#### 5.4.3 Refresh token route handlers

`app/api/auth/set-tokens/route.ts` — receives `{access_token, refresh_token, expires_in}` from client, sets refresh cookie:
```ts
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { access_token, refresh_token, expires_in } = await req.json()
  const c = await cookies()
  c.set("nookat_refresh", refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })
  // Optional: short-lived access hint cookie for RSC
  c.set("nookat_access_hint", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expires_in,
  })
  return NextResponse.json({ ok: true })
}
```

`app/api/auth/refresh-tokens/route.ts` — calls backend `/auth/refresh` using cookie-stored refresh, returns new access:
```ts
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  const c = await cookies()
  const refresh = c.get("nookat_refresh")?.value
  if (!refresh) return NextResponse.json({ error: "no_refresh" }, { status: 401 })

  const res = await fetch(`${process.env.API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  })
  if (!res.ok) {
    c.delete("nookat_refresh")
    return NextResponse.json({ error: "refresh_failed" }, { status: 401 })
  }
  const pair = await res.json()
  c.set("nookat_refresh", pair.refresh_token, { /* same opts as set-tokens */ })
  return NextResponse.json({ access_token: pair.access_token, expires_in: pair.expires_in })
}
```

`app/api/auth/logout/route.ts` — calls backend `/auth/logout`, clears cookies.

#### 5.4.4 Single-flight refresh helper

`lib/auth/refresh.ts`:
```ts
let inFlight: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const res = await fetch("/api/auth/refresh-tokens", { method: "POST" })
      if (!res.ok) return null
      const { access_token, expires_in } = await res.json()
      const { setTokens } = useAuthStore.getState()
      setTokens(access_token, expires_in)
      return access_token
    } catch {
      return null
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}
```

#### 5.4.5 OTP request page

`app/[locale]/auth/otp/page.tsx` — split into:
- Step 1: phone form (RHF + Zod). On submit: `apiClient.POST("/api/v1/auth/otp/request", { body: { phone } })`. Move to step 2 on success.
- Step 2: 6-box OTP input + resend countdown. On submit: `apiClient.POST("/api/v1/auth/otp/verify", { body: { phone, code } })`. On success, POST to `/api/auth/set-tokens` with the pair, set in-memory access, redirect to original `?return=` or `/account`.

OTP component (`components/auth/OtpInput.tsx`):
- 6 inputs, `inputMode="numeric"`, `maxLength={1}`
- Auto-advance to next on input
- Auto-back on Backspace if empty
- Paste-aware: paste of "123456" fills all 6
- Returns the joined string via `onComplete`

#### 5.4.6 Phone input

`components/auth/PhoneInput.tsx`:
- Default value: `+996 ` prefilled
- On blur: format via `libphonenumber-js`
- Submit: normalize to E.164 before sending

#### 5.4.7 Middleware auth gates

Update `middleware.ts` to enforce hard gates:
```ts
const HARD_GATED = [/^\/(?:ru|ky|en)\/account/, /^\/(?:ru|ky|en)\/orders/]

if (HARD_GATED.some((p) => p.test(req.nextUrl.pathname))) {
  const refresh = req.cookies.get("nookat_refresh")
  if (!refresh) {
    const loginUrl = new URL(`/${locale}/auth/otp`, req.url)
    loginUrl.searchParams.set("return", req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
}
```

#### 5.4.8 /me + /me/addresses pages

`app/[locale]/account/page.tsx` — server component fetches `/api/v1/me` server-side using access hint cookie. Shows name, email, phone (read-only), language preference.

`app/[locale]/account/addresses/page.tsx` — list + create/edit/delete addresses. Form components for each.

#### 5.4.9 Logout

Header "Выйти" button → calls `/api/auth/logout` → clears Zustand → redirects to `/[locale]`.

### 5.5 Sub-agent suggestion

- Agent A: PhoneInput + OTP flow pages
- Agent B: Refresh interceptor + route handlers + single-flight helper
- Agent C: /me + /me/addresses pages and forms

### 5.6 Test expectations

- Unit: phone normalization, refresh single-flight (mock fetches)
- Component: PhoneInput accepts various input formats; OtpInput auto-advances; auth store transitions
- E2E: full OTP flow from `/auth/otp` through `/account` (uses backend running with fake SMS — code from uvicorn log)
- E2E: hard-gate redirect `/account` → `/auth/otp` when no cookie
- E2E: address CRUD round-trip

### 5.7 Out of scope

- Cart-merge-on-login (Phase 8 implements; the backend handles it server-side; we just trigger by logging in)
- Account editing for phone/email change (post-MVP per PRODUCT)
- Admin auth (separate repo, Phase A1)

### 5.8 Definition of Done

- [ ] OTP request → verify flow works against running backend
- [ ] Refresh cookie set HttpOnly + Secure + SameSite=Lax
- [ ] Access token in memory only (verified in DevTools — no localStorage write)
- [ ] Silent refresh kicks in on 401, single-flight verified
- [ ] Hard gate redirects work
- [ ] /me + /me/addresses CRUD work
- [ ] Logout clears all state
- [ ] All quality gates green
- [ ] DECISION_LOG documents the access-hint-cookie approach

### 5.9 Hand-off

`BUILD_PROGRESS.md` Phase 5 checked. Smoke recipe: register a test user via OTP, browse /account, add an address, log out, log back in. Recommend Phase 6 next.

---

## Phase 6 — Catalog browse (read-only)

> **Mission.** Homepage, categories tree, category page, symptom page, branches list. All RSC, locale-aware, real data from backend. No cart, no add-to-cart action yet — pure browse.

### 6.1 Specs to re-read

- `FRONTEND_BLUEPRINT §10` (data fetching), `§15` (caching), `§16` (image handling)
- `DESIGN_BLUEPRINT §12.1`–`§12.5` (header, footer, homepage, category page)
- `PRODUCT_BLUEPRINT §8.2` (catalog features), `§7.1` (J-01 first-time symptom shopper)

### 6.2 Backend files to fetch

- `app/api/v1/categories.py`, `symptoms.py`, `branches.py`, `products.py` (just the routes; PDP itself in Phase 7)
- `app/domain/catalog/storefront_schemas.py` — every shape we'll consume
- `app/domain/catalog/storefront.py` — service-level behavior (cache TTLs, in_stock_only default)

### 6.3 Plan-first gate

Decisions:
- Homepage hero: type-led (DESIGN §8.2 Pattern A) for MVP
- Symptom grid order: backend's `sort_order`, capped at 12 on homepage, all on `/symptoms`
- Category card layout: 4-up desktop, 2-up tablet, 1-up phone
- Pagination on category page: page-numbered, 24 per page (backend default)
- Filter rail: collapse into Sheet on mobile; persistent on desktop
- Empty product image fallback: brand pill SVG

### 6.4 Implementation guidance

#### 6.4.1 Layout shells

`components/layout/Header.tsx` — sticky top bar per DESIGN §12.1–12.2. Mobile: hamburger + mark + search icon + cart icon. Desktop: full search + lang + account + cart.

`components/layout/Footer.tsx` — three-column desktop, stacked mobile. Per DESIGN §12.3.

`components/layout/MobileNav.tsx` — Sheet-based drawer for mobile.

#### 6.4.2 Homepage

`app/[locale]/page.tsx` (RSC):
1. Fetch categories tree + symptoms in parallel (server-side)
2. Render: hero (type-led), search bar, symptom grid (top 12), featured categories (top 6), trust strip, footer

#### 6.4.3 Categories

`app/[locale]/categories/page.tsx` — full category tree, expandable on hover/click.

`app/[locale]/categories/[slug]/page.tsx` — category detail header + breadcrumb + products list.

`app/[locale]/categories/[slug]/products/page.tsx` — paginated products grid with filters.

Server-side fetch:
```ts
const client = createServerApiClient()
const { data } = await client.GET("/api/v1/categories/{slug}/products", {
  params: { path: { slug }, query: { lang, page, page_size: 24, sort } },
})
```

#### 6.4.4 ProductCard

Fill in `components/product/ProductCard.tsx` (skeleton from Phase 2):
- Image (next/image with sizes, brand-pill fallback)
- Name + dosage label
- StockPip
- PriceTag (with compare-at handling)
- "Добавить в корзину" button — DISABLED in Phase 6 (Phase 8 wires the action). Show as primary button greyed-on-hover until Phase 8.

#### 6.4.5 Symptom grid

`components/symptom/SymptomTile.tsx` — square tile, icon, name, count.

`app/[locale]/symptoms/[slug]/page.tsx` — products tagged by symptom.

#### 6.4.6 Branches list

`app/[locale]/about/page.tsx` — fetches `/api/v1/branches`, displays the single Nookat branch with address, phone, hours, license. Trust-led photography pattern (DESIGN §8.2 Pattern C).

#### 6.4.7 Empty / loading states

Each `loading.tsx` per route segment shows a skeleton matching the final layout.

Empty state for `/symptoms/{slug}/products` when no products: `EmptyState` with friendly copy.

### 6.5 Sub-agent suggestion

- Agent A: Header, Footer, MobileNav, layout shells
- Agent B: Homepage + symptom grid
- Agent C: Category tree + category detail + products list
- Agent D: ProductCard + StockPip + PriceTag + SymptomTile

### 6.6 Test expectations

- Component tests for ProductCard (in-stock, out-of-stock, no-image, with-compare-at variants)
- E2E: visit homepage → click category → see grid → click symptom → see grid (J-01 partial)
- Visual regression: homepage at 3 breakpoints; one category page

### 6.7 Out of scope

- PDP (Phase 7)
- Search (Phase 7)
- Cart action (Phase 8)
- Filters beyond simple sort (Phase 11 hardening if time)

### 6.8 Definition of Done

- [ ] Homepage renders against running backend with real data
- [ ] All three locales render (run `/ky` and `/en` variants)
- [ ] Category tree → category page → products list works
- [ ] Symptom tiles → symptom products page works
- [ ] Branches page shows the Nookat branch
- [ ] All cards show stock pip + price correctly
- [ ] LCP measured ≤ 2.5s on Fast 3G throttle (Lighthouse local)
- [ ] All quality gates green

### 6.9 Hand-off

Phase 6 done. Smoke: full browse flow works. Recommend Phase 7 next.

---

## Phase 7 — PDP & search

> **Mission.** Product detail page with all the trust signals, substitutes block, search results page with composite ranking, autocomplete suggest with debounce.

### 7.1 Specs to re-read

- `DESIGN_BLUEPRINT §12.6` (PDP layout), `§15` (trust signals), `§8.3` (product photography spec)
- `FRONTEND_BLUEPRINT §10` (data fetching), `§16` (image handling)
- `PRODUCT_BLUEPRINT §F-CAT-003` (PDP requirements), `§F-CAT-008` (search)

### 7.2 Backend files to fetch

- `app/api/v1/products.py` — detail + related (substitutes)
- `app/api/v1/search.py` — search + suggest, ranking signals
- `app/domain/catalog/storefront_schemas.py` — `StorefrontProductDetail`, `SearchResultPage`, `SuggestResponse`
- `app/domain/catalog/search.py` — service behavior (synonyms, in_stock_only default true)

### 7.3 Plan-first gate

Decisions:
- PDP layout: tabs on desktop, accordion on mobile (DESIGN §12.6)
- Image carousel: simple swipe on mobile, prev/next on desktop; first image priority
- Substitutes: only same primary AI + dose, max 4
- Search debounce: 250ms for suggest
- "Search synonyms used" surface: visible chip row above results
- Filter rail (search results): manufacturer, in-stock, sort

### 7.4 Implementation guidance

#### 7.4.1 PDP

`app/[locale]/products/[slug]/page.tsx` (RSC):
- Server-side fetch product detail + related in parallel
- Generate metadata (title = product name + " | Nookat", description = short_description, OG image = primary image)
- Stream the main content first, suspend the substitutes block

Above-the-fold content (sticky on scroll if desktop):
- ImageCarousel (with `next/image`, `priority` on first)
- Product name (`<h1>`), manufacturer chip, country
- StockPip + DeliveryBadge
- PriceTag with compare-at
- Add-to-cart CTA (disabled if out-of-stock; alternatives section emphasized instead)
- Quantity stepper

Below the fold:
- Description tabs / accordion: composition, indications, usage, side effects, contraindications, storage
- ActiveIngredientChip row
- Substitutes block ("С тем же действующим веществом") — server-side suspended Suspense boundary
- Trust strip

#### 7.4.2 ImageCarousel

`components/product/ImageCarousel.tsx`:
- Square aspect (1:1)
- Touch-swipe on mobile, prev/next buttons on desktop
- Thumbnail strip below (desktop)
- LCP optimization: first image is `priority={true}`, subsequent are lazy
- Empty state: brand pill SVG (DESIGN §8.4)

#### 7.4.3 Substitutes block

`components/product/SubstitutesBlock.tsx`:
- Heading: i18n `product.same_ingredient.heading`
- Up to 4 ProductCard variants (compact)
- Empty state: not shown if no substitutes (no fallback message — gracefully omit)

#### 7.4.4 Search

`app/[locale]/search/page.tsx` (RSC, with searchParams):
- Read `q` from searchParams (URL-driven state)
- Server-side fetch `/api/v1/search?q=&lang=&page=`
- If `q.length < 2`, redirect to `/search/empty` or show "Введите минимум 2 символа"
- Render: query echo + synonyms chips + results grid + filter rail + pagination
- Empty state: `search.no_results.title` + popular searches

#### 7.4.5 SearchInput + SearchSuggest

`components/search/SearchInput.tsx` (client):
- Controlled input
- Debounced (250ms) call to `/api/v1/search/suggest`
- Render dropdown with:
  - Top products (5) with thumbnail
  - Top categories (3)
  - Top symptoms (3)
- Click → navigate to product/category/symptom OR search results
- Esc closes; arrow keys navigate

Loading hint: "Ищем…" while in flight.

`components/search/SearchSuggest.tsx` — the dropdown panel, headless, can be reused on mobile full-screen overlay.

#### 7.4.6 SEO metadata

`app/[locale]/products/[slug]/page.tsx`:
```ts
export async function generateMetadata({ params }: Props) {
  const { slug, locale } = await params
  const client = createServerApiClient()
  const { data: product } = await client.GET("/api/v1/products/{slug}", {
    params: { path: { slug }, query: { lang: locale } },
  })
  return {
    title: `${product.name} | Nookat`,
    description: product.short_description,
    openGraph: {
      title: product.name,
      description: product.short_description,
      images: [product.images[0]?.url].filter(Boolean),
    },
    alternates: {
      languages: {
        ru: `/ru/products/${slug}`,
        ky: `/ky/products/${slug}`,
        en: `/en/products/${slug}`,
      },
    },
  }
}
```

### 7.5 Test expectations

- Component: ImageCarousel (single image, multiple, swipe, no images)
- Component: SearchSuggest (renders empty, with results, keyboard nav)
- E2E: search "панадол" → see results → click product → PDP loads
- E2E: PDP for an out-of-stock product shows substitutes prominently
- Lighthouse: PDP LCP ≤ 2.5s

### 7.6 Out of scope

- Add-to-cart action (Phase 8)
- Wishlist, compare, reviews (post-MVP)
- Filter rail beyond simple sort + manufacturer (incremental)

### 7.7 Definition of Done

- [ ] PDP renders for in-stock and out-of-stock products
- [ ] Substitutes block shows when applicable
- [ ] All description sections visible and accessible
- [ ] Search results page with synonyms + pagination
- [ ] Search suggest debounced, keyboard-navigable
- [ ] SEO metadata generated; OG images correct
- [ ] All quality gates green

### 7.8 Hand-off

Phase 7 done. Recommend Phase 8 next.

---

## Phase 8 — Cart

> **Mission.** Cart drawer + cart page, add/update/remove flows, optimistic updates, guest cart cookie integration, cart-merge-on-login, price/stock conflict UX.

### 8.1 Specs to re-read

- `FRONTEND_BLUEPRINT §11` (state management — cart store), `§14.4` (toast guidelines)
- `DESIGN_BLUEPRINT §12.7` (cart page), `§13.6` (quantity stepper)
- `PRODUCT_BLUEPRINT §F-CART-001..005` (cart features), `§7.1` J-01 cart steps
- `CLAUDE.md > Domain reality checks > Cart cookie`, `> Snapshot immutability`

### 8.2 Backend files to fetch

- `app/api/v1/cart.py` — every endpoint
- `app/domain/orders/cart_service.py` — service-level behavior (price snapshot, stock recheck, merge)
- `app/domain/orders/schemas.py` — `CartRead`, `CartItemRead`, `CartTotalsRead`

### 8.3 Plan-first gate

Decisions:
- Cart UI: drawer on desktop (slide from right), full page on mobile + dedicated `/cart` page on both
- Optimistic updates: yes for qty change and remove; rollback on error
- Cart-merge-on-login: backend handles automatically on `/auth/otp/verify` if `pharmacy_cart_session` cookie is present. Frontend just lets it happen.
- Price-changed UX: inline diff with confirm button per line
- Stock conflict UX: inline banner + suggested alternatives

### 8.4 Implementation guidance

#### 8.4.1 Cart query

`lib/cart/queries.ts`:
```ts
export const cartQueryKey = ["cart"] as const

export function useCart() {
  return useQuery({
    queryKey: cartQueryKey,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/cart")
      if (error) throw error
      return data
    },
    staleTime: 0, // always fresh
  })
}
```

#### 8.4.2 Cart mutations

`lib/cart/mutations.ts`:
```ts
export function useAddToCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { product_id: string; quantity: number }) =>
      apiClient.POST("/api/v1/cart/items", { body: input }),
    onSuccess: (data) => {
      qc.setQueryData(cartQueryKey, data.data)
      toast.success(t("cart.added"))
    },
    onError: (error: ApiError) => {
      toast.error(t(`error.${error.code}`, { defaultValue: t("error.generic") }))
    },
  })
}

export function useUpdateCartItem() {
  // optimistic update
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      apiClient.PATCH("/api/v1/cart/items/{item_id}", {
        params: { path: { item_id: itemId } },
        body: { quantity },
      }),
    onMutate: async ({ itemId, quantity }) => {
      await qc.cancelQueries({ queryKey: cartQueryKey })
      const previous = qc.getQueryData<CartRead>(cartQueryKey)
      qc.setQueryData<CartRead>(cartQueryKey, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((it) =>
            it.id === itemId ? { ...it, quantity } : it
          ),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(cartQueryKey, ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: cartQueryKey })
    },
  })
}

export function useRemoveCartItem() { /* similar pattern */ }
```

#### 8.4.3 CartLine component

`components/cart/CartLine.tsx`:
- Thumbnail (or pill fallback)
- Name + slug link
- Dosage label
- PriceTag with compare-at
- QuantityStepper (uses useUpdateCartItem)
- Remove button (uses useRemoveCartItem)
- Stock-out banner if `is_in_stock === false` (red strip with "Нет в наличии" + "Удалить" CTA)
- Price-changed banner if `current_price !== price_snapshot` ("Цена изменилась: X → Y" with "Обновить" CTA)

#### 8.4.4 CartTotals

`components/cart/CartTotals.tsx`:
- Subtotal, delivery fee (filled at quote time, null pre-quote), discount, total
- Free-delivery progress bar if applicable: "До бесплатной доставки X сом"
- Sticky bottom on mobile

#### 8.4.5 Cart drawer (desktop) + cart page

`components/cart/CartDrawer.tsx` — Sheet primitive, opens from right on cart icon click on desktop. Mobile: clicking cart icon navigates to `/cart`.

`app/[locale]/cart/page.tsx` — full page cart, RSC scaffold + client child for the interactive list.

Empty state: `EmptyState` with `cart.empty.*` keys.

#### 8.4.6 Add-to-cart on PDP and product cards

Wire ProductCard's CTA (disabled in Phase 6, enabled here) to `useAddToCart`. PDP CTA wires the same. Toast on success; cart icon badge increments.

#### 8.4.7 Cart cookie + auth merge

The `pharmacy_cart_session` cookie is set by the backend on first cart interaction. We do nothing — `credentials: "include"` on requests sends it automatically. On login (Phase 5), the backend's verify endpoint merges by reading the cookie. We just need to **invalidate the cart query** after successful OTP verify so the merged state shows up.

Add to OTP verify success handler:
```ts
queryClient.invalidateQueries({ queryKey: cartQueryKey })
```

### 8.5 Test expectations

- Component: CartLine in normal, out-of-stock, price-changed states
- E2E: add to cart → drawer opens → navigate to /cart → update qty → remove → empty state
- E2E: place item in cart as guest → log in via OTP → cart preserved (merge)

### 8.6 Out of scope

- Checkout (Phase 9)
- Save-for-later, wishlist (post-MVP)

### 8.7 Definition of Done

- [ ] Add to cart works from PDP and product cards
- [ ] Quantity stepper updates with optimistic UI
- [ ] Remove works
- [ ] Stock-out and price-changed banners surface inline
- [ ] Cart preserved across guest → logged-in transition
- [ ] Empty state correct
- [ ] All quality gates green

### 8.8 Hand-off

Phase 8 done. Recommend Phase 9 next.

---

## Phase 9 — Checkout & order placement

> **Mission.** Single-page checkout: delivery method (pickup/delivery), payment method, address picker or new address inline, quote → place_order with idempotency key, conflict resolution, redirect to confirmation.

### 9.1 Specs to re-read

- `DESIGN_BLUEPRINT §12.8` (checkout), `§13.4` (address input), `§17` (voice/tone for confirmations)
- `FRONTEND_BLUEPRINT §12` (forms), `§14` (error handling)
- `PRODUCT_BLUEPRINT §F-CHK-001..005` (checkout features), `§7.1` J-01 checkout steps
- `CLAUDE.md > Sacred invariants > Idempotency-Key required on /checkout/place`

### 9.2 Backend files to fetch

- `app/api/v1/checkout.py` — quote + place
- `app/domain/orders/checkout_service.py` — quote behavior, conflicts, FEFO, payment branching
- `app/domain/orders/schemas.py` — `CheckoutQuoteRequest/Response`, `PlaceOrderRequest/Response`, conflict shapes
- `app/domain/payments/services.py` — payment provider redirect contract

### 9.3 Plan-first gate

Decisions:
- Single-page checkout (no wizard) — confirms FRONTEND §12.8
- Delivery method default: pickup (per kickoff: pickup is priority)
- Payment method default: cash_on_delivery
- Idempotency key: generated once per form mount, reused on retry
- Quote refetch: on every section change (delivery method, address, payment method)
- Place-order auth: hard gate; if guest, redirect to OTP first then return

### 9.4 Implementation guidance

#### 9.4.1 Checkout page

`app/[locale]/checkout/page.tsx`:
- Auth required (middleware); redirects guests to `/auth/otp?return=/checkout`
- Server-side: fetch addresses (for the address picker)
- Client child: `<CheckoutForm />` with all the state

#### 9.4.2 CheckoutForm

`components/checkout/CheckoutForm.tsx` (client):
```tsx
const [idempotencyKey] = useState(() => crypto.randomUUID())

// Form state
const form = useForm<CheckoutSchema>({
  resolver: zodResolver(CheckoutSchema),
  defaultValues: {
    delivery_method: "pickup",
    payment_method: "cash_on_delivery",
    /* ... */
  },
})

// Quote query - refetch on key fields change
const quote = useQuery({
  queryKey: ["quote", form.watch("delivery_method"), form.watch("payment_method"), form.watch("address_id")],
  queryFn: async () => {
    const { data } = await apiClient.POST("/api/v1/checkout/quote", {
      body: {
        delivery_method: form.watch("delivery_method"),
        payment_method: form.watch("payment_method"),
        address_id: form.watch("address_id"),
      },
    })
    return data
  },
  enabled: !!form.watch("delivery_method"),
})

// Place order mutation
const place = useMutation({
  mutationFn: (values) => apiClient.POST("/api/v1/checkout/place", {
    body: values,
    headers: { "Idempotency-Key": idempotencyKey },
  }),
  onSuccess: (res) => {
    if (res.data?.payment_redirect_url) {
      window.location.assign(res.data.payment_redirect_url)
    } else {
      router.push(`/${locale}/orders/${res.data.order_number}`)
    }
  },
  onError: (err: ApiError) => {
    if (err.code === "out_of_stock" || err.code === "price_changed") {
      // re-quote and surface inline
      quote.refetch()
    } else if (err.code === "idempotency_conflict") {
      toast.error(t("checkout.idempotency_conflict"))
    } else {
      // generic
    }
  },
})
```

#### 9.4.3 Sections

`components/checkout/DeliveryMethodSection.tsx` — radio group: pickup (default) / delivery
- Pickup: shows the Nookat branch address + hours
- Delivery: shows AddressPicker

`components/checkout/AddressPicker.tsx` — dropdown of saved addresses + "Add new" option (inline form expanding below)

`components/checkout/PaymentMethodSection.tsx` — radio group: cash_on_delivery (default) + card_online + others (mbank/elsom/etc — show all backend-supported)

`components/checkout/RecipientSection.tsx` — recipient name + phone (default to user's, editable)

`components/checkout/NotesSection.tsx` — collapsible textarea

`components/checkout/ReviewBlock.tsx` — sticky bottom on mobile / right rail on desktop:
- Items summary (3 max + "and N more")
- Totals (from quote)
- "Place order" button (disabled until quote settles + form valid)

#### 9.4.4 Conflict resolution UI

If quote returns `stock_conflicts` or `price_conflicts`:
- Top-of-form banner with code-resolved message
- Per-line indicator on offending items (link to /cart with anchor)
- "Place order" button disabled until conflicts resolved

#### 9.4.5 Confirmation page

`app/[locale]/orders/[orderNumber]/page.tsx` — also covers Phase 10. After place_order success, navigate here. Big check, order number in `--text-mono`, summary, status timeline (initial state), phone CTA.

### 9.5 Test expectations

- Component: each checkout section in isolation
- E2E: full place-order flow end-to-end (login → cart → checkout → confirmation)
- E2E: out-of-stock conflict — quote returns conflict, UI surfaces, removing item resolves
- E2E: idempotent retry — submit, simulate network failure, retry button uses same idempotency key

### 9.6 Out of scope

- Real card payment integration (Phase 10 of backend deferred to launch readiness Q14; we use the fake redirect for now)
- Address geocoding (post-MVP)
- Saved payment methods (post-MVP)

### 9.7 Definition of Done

- [ ] Pickup flow places order against running backend
- [ ] Delivery flow with saved address places order
- [ ] Delivery flow with new inline address places order
- [ ] Idempotency key behavior verified (retry uses same key)
- [ ] Conflict resolution works
- [ ] Order confirmation page renders correctly
- [ ] All quality gates green

### 9.8 Hand-off

Phase 9 done. J-01 should be complete end-to-end. Recommend Phase 10 next.

---

## Phase 10 — Order history & detail

> **Mission.** /orders list, /orders/[orderNumber] detail with status timeline + polling, cancel flow, reorder flow.

### 10.1 Specs to re-read

- `DESIGN_BLUEPRINT §12.10` (account pages), `§12.11` (order detail), `§11.3` (OrderStatusTimeline)
- `FRONTEND_BLUEPRINT §15` (caching — polling)
- `PRODUCT_BLUEPRINT §F-ORD-001..004` (order features), `§7.2` J-02 reorder

### 10.2 Backend files to fetch

- `app/api/v1/me_orders.py` — every endpoint
- `app/domain/orders/order_service.py` — cancel rules, reorder behavior
- `app/domain/orders/lifecycle.py` — state machine (constants only)

### 10.3 Plan-first gate

Decisions:
- Polling interval: 60s for active orders (not delivered/cancelled/refunded); stops on terminal state
- Cancel UX: confirmation dialog with reason textarea (optional)
- Reorder UX: navigate to /cart with toast showing "N items added, M unavailable"

### 10.4 Implementation guidance

#### 10.4.1 Orders list

`app/[locale]/orders/page.tsx` (RSC + client wrapper for pagination):
- Fetch `/api/v1/me/orders`
- Render: list of order cards with order number, status badge, total, placed_at
- Empty state: `EmptyState` with "Здесь появятся ваши заказы"
- Pagination: simple page-numbered

#### 10.4.2 Order detail with polling

`app/[locale]/orders/[orderNumber]/page.tsx`:
- Server-side initial fetch of full order
- Client child polls `/api/v1/me/orders/{order_number}/status` every 60s while status is non-terminal
- Renders OrderStatusTimeline, items list, address, totals, action buttons

```tsx
"use client"
const TERMINAL = ["delivered", "cancelled", "refunded"]
const status = useQuery({
  queryKey: ["order-status", orderNumber],
  queryFn: () => apiClient.GET("/api/v1/me/orders/{order_number}/status", { params: { path: { order_number: orderNumber } } }),
  refetchInterval: (q) => TERMINAL.includes(q.state.data?.status ?? "") ? false : 60_000,
  initialData: initialStatus,
})
```

#### 10.4.3 OrderStatusTimeline

`components/order/OrderStatusTimeline.tsx`:
- Vertical list of states with icons + timestamps
- Current state highlighted
- Pending / cancelled / delivered visually distinct

#### 10.4.4 Cancel flow

Button → AlertDialog → confirm with optional reason → POST `/me/orders/{n}/cancel` → toast + refetch.

#### 10.4.5 Reorder flow

Button → POST `/me/orders/{n}/reorder` → toast showing breakdown ("X добавлено, Y недоступно") → navigate to /cart.

The response includes annotated lines explaining why some items couldn't be added (out_of_stock, price_changed, product_deleted). Show a Dialog with the breakdown if any non-`added` reasons exist.

### 10.5 Test expectations

- Component: OrderStatusTimeline (each state)
- E2E: place order → see in list → open detail → status polls → cancel works
- E2E: J-02 reorder: open delivered order → reorder → cart populated

### 10.6 Out of scope

- Order tracking with courier real-time (post-MVP, requires courier integration)
- Reviews / ratings (post-MVP)

### 10.7 Definition of Done

- [ ] Orders list paginated
- [ ] Order detail polls status
- [ ] Cancel works
- [ ] Reorder works (with annotated lines surfaced)
- [ ] All quality gates green

### 10.8 Hand-off

Phase 10 done. J-01 + J-02 complete end-to-end. Recommend Phase 11 next.

---

## Phase 11 — Hardening: SEO, perf, a11y

> **Mission.** Polish pass: SEO metadata everywhere, JSON-LD structured data, Lighthouse green, axe clean, error boundaries, every empty/error state polished.

### 11.1 Specs to re-read

- `FRONTEND_BLUEPRINT §17` (performance), `§18` (security), `§19` (observability), `§20` (testing)
- `DESIGN_BLUEPRINT §14` (empty/loading/error), `§15` (trust signals), `§16` (a11y)
- `PRODUCT_BLUEPRINT §15` (SEO), `§14` (a11y)

### 11.2 Backend files to fetch

None — this phase is about polishing what we built.

### 11.3 Plan-first gate

Plan a checklist of polish items, organized into:
- SEO (meta tags, sitemap, robots, JSON-LD)
- Performance (LCP, JS budget, image optimization audit)
- Accessibility (axe scan, keyboard test pass, screen reader test)
- Error states (every error path tested)
- Loading states (every skeleton wired)
- Empty states (every list with proper empty)

### 11.4 Implementation guidance

#### 11.4.1 SEO

- `app/[locale]/sitemap.ts` — generates sitemap from category + product slugs
- `app/[locale]/robots.ts` — allows everything except /api and dev routes
- `generateMetadata` on every route segment (homepage, category, PDP, search, etc.)
- `alternates.languages` for hreflang on every public page
- `lib/seo/jsonld.ts` helpers: Product, BreadcrumbList, Organization, LocalBusiness (for the Nookat branch)

#### 11.4.2 Performance

- Run Lighthouse on every key route; chase budget (LCP ≤ 2.5s on Slow 3G, JS ≤ 180 KB gz)
- Audit `next/image` usage everywhere — `priority` only on LCP candidates
- Audit `"use client"` boundaries — pull up where possible
- Run `pnpm build` and inspect `.next/analyze/` (with `@next/bundle-analyzer`)

Add Lighthouse CI:
```yaml
- run: pnpm dlx @lhci/cli@latest autorun --upload.target=temporary-public-storage --collect.url=http://localhost:3000/ru
```

Set budgets in `lighthouserc.json`.

#### 11.4.3 Accessibility

- Run `pnpm test` with axe assertion in component tests (already set up Phase 1)
- Manual pass with NVDA on Windows + VoiceOver on macOS — homepage, PDP, cart, checkout, order detail
- Keyboard-only test: navigate the entire J-01 flow without a mouse
- Color contrast audit (every meaningful text/background pair)
- Focus visible everywhere (no silent `outline: none`)

#### 11.4.4 Error boundaries

- `app/[locale]/error.tsx` and `app/[locale]/not-found.tsx` polished
- Component-level boundaries on the substitutes block, search suggest, related products (graceful degradation)

#### 11.4.5 Sentry hardening

- Set `SENTRY_DSN` (acquire from team); confirm errors flow
- `beforeSend` filter strips PII (phone, email, address from breadcrumbs)
- Web Vitals reporting via `useReportWebVitals` → Sentry performance

#### 11.4.6 Security headers

`next.config.ts`:
```ts
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
        // CSP set via reverse proxy (Caddy) for flexibility
      ],
    },
  ]
}
```

### 11.5 Test expectations

- All component tests run axe; zero critical violations
- E2E pass at all 3 breakpoints
- Lighthouse CI green on PRs

### 11.6 Out of scope

- A/B testing infrastructure (post-MVP)
- Service worker / PWA (post-MVP if not in MVP scope)

### 11.7 Definition of Done

- [ ] Lighthouse Performance ≥ 90 on homepage, PDP, search, cart
- [ ] Lighthouse Accessibility = 100 on those pages
- [ ] SEO metadata on every public route (verify with `curl | grep og:`)
- [ ] Sitemap generated and accessible
- [ ] JSON-LD on PDP (Product) + homepage (Organization + LocalBusiness)
- [ ] axe scan: zero critical
- [ ] Manual SR test passed (one route minimum, document any blockers)
- [ ] Sentry receives errors in staging
- [ ] Security headers verified via `curl -I`
- [ ] All quality gates green

### 11.8 Hand-off

Phase 11 done. Recommend Phase 12 next.

---

## Phase 12 — Storefront launch readiness

> **Mission.** Final gates: legal pages, deploy runbooks, smoke tests against staging, all sacred invariants verified, docs.

### 12.1 Specs to re-read

- `FRONTEND_BLUEPRINT §22` (build/deploy)
- `DESIGN_BLUEPRINT §21` (conventions checklist)
- `CLAUDE.md > Sacred invariants`, `> Hard prohibitions`

### 12.2 Backend files to fetch

- `LAUNCH_CHECKLIST.md` (backend) — see how the backend organized its launch checklist; mirror the pattern
- `docs/runbooks/*.md` (backend) — model for our runbooks

### 12.3 Implementation guidance

#### 12.3.1 Legal pages

`app/[locale]/terms/page.tsx`, `privacy/page.tsx`, `delivery/page.tsx`, `returns/page.tsx`. Markdown-driven content; the actual legal text comes from owners.

For Phase 12 we ship the page shells with placeholder text + clear "TBD: legal review" callouts. Real content goes in before public launch.

#### 12.3.2 Documentation

- `docs/ARCHITECTURE.md` — high-level architecture diagram, stack, deployment topology
- `docs/CONTRIBUTING.md` — how to set up locally, conventions
- `docs/runbooks/deploy.md` — deploy procedure, rollback
- `docs/runbooks/monitoring.md` — how to read Sentry, where dashboards live
- `docs/runbooks/incidents.md` — runbook for site-down, OTP-not-arriving, payment-stuck

#### 12.3.3 Coolify deploy

- Configure Coolify project for storefront
- Set env vars (`API_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_*`)
- TLS via Caddy or Coolify's Traefik
- Auto-deploy on push to `main`

#### 12.3.4 Smoke tests

`tests/smoke/` — minimal Playwright suite that runs against deployed staging:
- Homepage loads
- Search works
- PDP loads
- /api/health returns ok
- A test user can OTP-login (using a known dev SMS code via API)
- Place order goes through

#### 12.3.5 Launch checklist

`LAUNCH_CHECKLIST.md` — mirror the backend's. Sections:
- Code & tests (all phases done, all tests green)
- Security (CSP, HSTS, no secrets in repo, deps audited)
- Observability (Sentry live, web vitals reporting)
- Deployment (Coolify configured, TLS green, runbooks written)
- Content (legal pages real, license number filled, support phone real, address real)
- Brand (real logo swapped in, favicons regenerated)
- i18n (all keys exist in all three locales)
- Backend coordination (CORS includes our domain; backend's launch blockers Q13/14/15 status)

### 12.4 Definition of Done

- [ ] All Phase 1–11 acceptance criteria green
- [ ] Legal pages exist (placeholder content acceptable for staging; real content gates production)
- [ ] Runbooks written
- [ ] Coolify deployment live on staging
- [ ] Smoke tests pass against staging
- [ ] LAUNCH_CHECKLIST has every box that can be checked, checked
- [ ] Conventions checklist (DESIGN §21) completed
- [ ] Brand placeholder logo swapped or noted as outstanding
- [ ] All quality gates green
- [ ] `v1.0.0-rc1` tag on git

### 12.5 Hand-off

Phase 12 done. Storefront is at `v1.0.0-rc1` parity with backend. Outstanding items go into `LAUNCH_CHECKLIST.md`. Admin track A1–A6 can have run in parallel after Phase 5 (admin doesn't need cart/checkout).

---

# Part 3b — Admin Build Phases

The admin app is a separate repo (`nookat-admin`). It can start in parallel with storefront Phase 5 (after auth foundations are clear) — admin uses different auth (session cookies) but reuses the type-gen pipeline and design tokens.

## Phase A1 — Admin foundation & login

> **Mission.** Boot admin Next.js repo, configure session-cookie auth, login page, sidebar shell layout, `/me` admin endpoint integration.

### A1.1 Specs to re-read

- `FRONTEND_BLUEPRINT §3.2` (admin repo), `§5` (admin directory structure), `§8.5` (admin auth)
- `DESIGN_BLUEPRINT §19` (admin design language)
- `PRODUCT_BLUEPRINT §19` (admin operations)

### A1.2 Backend files to fetch

- `app/api/admin_v1/auth.py`
- `app/api/admin_v1/router.py` — full admin endpoint inventory
- `app/domain/identity/dependencies.py` — `get_current_admin`, `require_role` factory
- `app/domain/identity/schemas.py` — `AdminLoginIn`, `AdminMeRead`

### A1.3 Plan-first gate

Mirrors storefront Phase 1 + Phase 2 + Phase 3 + Phase 5 in compressed form:
- Bootstrap nookat-admin repo (Next.js 15, TS strict, Tailwind, shadcn)
- Apply same brand tokens (DESIGN §4–10) — duplicate from storefront
- Set up openapi-typescript pipeline (same backend, same generated types)
- Login flow: email + password (+ optional TOTP); cookie-based session
- Sidebar shell layout
- /me admin page

### A1.4 Implementation guidance

#### A1.4.1 Bootstrap (compressed)

Same as storefront Phase 1, but:
- No locale segment
- No next-intl (admin is RU-only for MVP)
- Different Sentry project ID

#### A1.4.2 Login

`app/(auth)/login/page.tsx` — email + password form + optional TOTP:
```tsx
const onSubmit = async (values) => {
  const res = await fetch(`${API_URL}/api/admin/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  })
  if (!res.ok) {
    const err = await res.json()
    setError("password", { message: err.code })
    return
  }
  router.push("/")
}
```

The backend sets `admin_session` HttpOnly cookie on success.

#### A1.4.3 Auth middleware

`middleware.ts`:
```ts
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/login")) return NextResponse.next()
  const session = req.cookies.get("admin_session")
  if (!session) return NextResponse.redirect(new URL("/login", req.url))
  return NextResponse.next()
}
```

#### A1.4.4 Sidebar shell

`app/(admin)/layout.tsx` — flexbox: sidebar (width 240px) + main content. Sidebar has nav links: Orders / Catalog / Inventory / Reports / Audit. Footer of sidebar: admin's name + logout.

#### A1.4.5 /me admin

`components/layout/AdminHeader.tsx` — top bar with admin name + branch + role + logout.

### A1.5 Definition of Done

- [ ] Admin app builds and serves on `:3001` (different port from storefront)
- [ ] Login form works against backend
- [ ] Cookie-based session persists across reloads
- [ ] Sidebar layout renders
- [ ] Logout works
- [ ] All quality gates green

### A1.6 Hand-off

Recommend A2 next.

---

## Phase A2 — Admin orders queue & picking

> **Mission.** Orders queue table with filters, order detail with picking workflow, lifecycle action buttons (confirm / start-preparing / mark-ready / dispatch / mark-delivered / cancel / refund).

### A2.1 Specs to re-read

- `DESIGN_BLUEPRINT §19.2` (admin pages), `§19.3` (admin components: DataTable, OrderActionStrip)
- `PRODUCT_BLUEPRINT §F-ADM-ORD-001..010`, `§7.4` J-04 fulfill order

### A2.2 Backend files to fetch

- `app/api/admin_v1/orders.py` — every action
- `app/domain/orders/admin_schemas.py` — admin-only fields
- `app/domain/orders/lifecycle.py` — state machine + `ALLOWED_TRANSITIONS`

### A2.3 Plan-first gate

Decisions:
- DataTable based on TanStack Table v8
- Filters: status (multi-select), branch (super_admin only), date range, recipient phone
- Bulk actions: not in MVP (per-row first)
- RBAC: hide/disable actions per role (refund only super_admin/branch_manager)
- Refund idempotency key: same pattern as place_order

### A2.4 Implementation guidance

#### A2.4.1 Orders queue

`app/(admin)/orders/page.tsx`:
- DataTable with columns: order_number, status badge, recipient, total, placed_at, actions
- Filters in left rail
- Pagination
- Click row → /orders/[id]

#### A2.4.2 Order detail (picking)

`app/(admin)/orders/[id]/page.tsx`:
- Two-column desktop: items list (left) + customer info + delivery + totals (right)
- OrderStatusTimeline at top
- Action strip sticky at bottom with the next-step button(s) per current state:
  - pending → "Подтвердить"
  - confirmed → "Начать сборку"
  - preparing → "Готов к выдаче" / "Готов к отправке"
  - ready_for_pickup → (waiting for customer)
  - out_for_delivery → "Доставлен"
  - any pre-delivered → "Отменить"
  - delivered → "Возврат"
- Each action confirms via Dialog
- Refund: separate flow with amount + reason + idempotency key

#### A2.4.3 Swap batch action

Per-item action: "Сменить партию" → opens dialog, lists FEFO-eligible batches → swap.

### A2.5 Test expectations

- E2E: J-04 happy path (admin logs in, sees pending order, confirms, starts preparing, marks ready)
- E2E: cancel from preparing
- E2E: refund (super_admin role)

### A2.6 Definition of Done

- [ ] Queue table works with filters
- [ ] Detail shows everything backend returns
- [ ] All lifecycle transitions wired
- [ ] RBAC respected
- [ ] Refund idempotent
- [ ] All quality gates green

---

## Phase A3 — Admin catalog CRUD

> **Mission.** Manufacturers, ingredients, categories, symptoms, products — list + create + edit. Image upload for products.

### A3.1 Specs to re-read

- `PRODUCT_BLUEPRINT §F-ADM-CAT-001..010`
- `DESIGN_BLUEPRINT §19.2` (admin pages list)

### A3.2 Backend files to fetch

- `app/api/admin_v1/manufacturers.py`, `active_ingredients.py`, `categories.py`, `symptoms.py`, `products.py`
- `app/domain/catalog/schemas.py` (admin shapes vs storefront shapes)

### A3.3 Implementation guidance

For each entity (manufacturers, ingredients, etc.):
- List page with DataTable + create button
- Create/edit modal with form
- Delete with confirm

Products page is the heaviest — multi-tab form (basic / pricing / clinical / images / categorization). Image upload uses backend's `/admin/v1/products/{id}/images` endpoint with the right multipart shape.

CSV import: `/admin/v1/products/import` is async — show progress polling on the import status endpoint.

### A3.4 Definition of Done

- [ ] All 5 entity types: list, create, edit, delete
- [ ] Product images upload + reorder + delete primary
- [ ] CSV bulk import with progress
- [ ] All quality gates green

---

## Phase A4 — Admin inventory & receive batches

> **Mission.** Receive new stock (batch creation with FEFO-aware date validation), batches list, stock movements view, low-stock alerts.

### A4.1 Specs to re-read

- `PRODUCT_BLUEPRINT §F-ADM-INV-001..006`, `§7.3` J-03 receive batch
- `DESIGN_BLUEPRINT §19.3` (BatchPicker)

### A4.2 Backend files to fetch

- `app/api/admin_v1/inventory.py`
- `app/domain/inventory/services.py` — 7-day expiry hard block

### A4.3 Implementation guidance

Receive flow:
- Form: branch + supplier + product + batch number + quantity + expiry + cost
- Validate expiry ≥ 7 days from now (matches backend)
- Submit creates batch + stock_movement + branch_product upsert

Batches list:
- DataTable with FEFO sort default (earliest expiry first)
- Filter: near-expiry (<60 days), branch, product

Stock movements:
- Read-only audit view
- Filter by date / type / batch

### A4.4 Definition of Done

- [ ] Receive flow works end-to-end
- [ ] Batches list with filters
- [ ] Stock movements view
- [ ] All quality gates green

---

## Phase A5 — Admin reports

> **Mission.** Sales report, top products, with date range + branch filter. CSV export.

### A5.1 Specs to re-read

- `PRODUCT_BLUEPRINT §F-ADM-RPT-001..003`

### A5.2 Backend files to fetch

- `app/api/admin_v1/reports.py`

### A5.3 Implementation guidance

- Report selector + date range + branch filter
- Render with Recharts (or similar light chart lib)
- CSV download via `?format=csv`

### A5.4 Definition of Done

- [ ] Sales report renders + downloads
- [ ] Top products renders + downloads
- [ ] All quality gates green

---

## Phase A6 — Admin audit & launch

> **Mission.** Audit log viewer with diff display. Final admin launch readiness.

### A6.1 Specs to re-read

- `PRODUCT_BLUEPRINT §F-ADM-AUD-001`

### A6.2 Backend files to fetch

- `app/api/admin_v1/audit.py`

### A6.3 Implementation guidance

- Searchable, filterable audit log table
- Click row → side panel with before/after JSON diff (use a tiny diff library or build with `<pre>` + colored spans)

Then mirror storefront Phase 12 launch readiness for the admin app.

### A6.4 Definition of Done

- [ ] Audit log searchable
- [ ] Diff viewer works
- [ ] Admin launch checklist green
- [ ] Coolify admin deployment live
- [ ] All quality gates green

---

# Part 4 — Meta-Prompts

These prompts apply across phases. Use them when the situation arises.

## Code review meta-prompt

> Review my recent changes against the project's standards. Focus on:
>
> 1. **Sacred invariants** (CLAUDE.md): no scarcity UX, no medical advice, no fake claims, support phone visible, idempotency keys present, refresh in cookie only, no PII logging.
> 2. **Brand discipline**: any literal "Nookat" outside `lib/brand.ts` or `messages/*.json`?
> 3. **i18n discipline**: any hardcoded user-visible strings? Any keys missing from one of three locales?
> 4. **Design tokens**: any raw hex / raw font-size / raw spacing in components?
> 5. **API contract**: any hand-written API types? Any divergence from `generated/api.d.ts`?
> 6. **TypeScript hygiene**: any `any`? Any `@ts-ignore`?
> 7. **Accessibility**: any focus rings missing? Any icon-only buttons without aria-label? Any color-only signals?
> 8. **Performance**: any client component that should be RSC? Any image without `sizes`?
> 9. **Test coverage**: are the new components/flows tested at the right layers (unit/component/E2E)?
> 10. **Spec compliance**: does the implementation match the cited spec sections, or did it drift?
>
> List findings ordered by severity. For each, link to the spec section that grounds it. Suggest fixes.

## Debugging meta-prompt

> I'm stuck on [BUG]. Help me debug systematically.
>
> 1. State what I expect vs what I observe.
> 2. List 5 hypotheses for the cause, ordered by likelihood.
> 3. For each, what's the cheapest test to falsify it?
> 4. Run the cheapest tests in order. Don't skip ahead.
> 5. After each result, update the hypothesis ranking.
> 6. When down to 1 hypothesis, write a failing test that reproduces, then fix.
>
> Common pharmacy-frontend bugs:
> - 401 loops (refresh interceptor mis-configured)
> - hydration mismatch (`Date.now()` in RSC; `Math.random()` in render; locale-dependent rendering on server vs client)
> - cart cookie not sent (missing `credentials: "include"`)
> - i18n key lookups returning the key (typo or missing in one locale)
> - generated types out of sync (run `pnpm types:generate`)
> - CORS in dev (backend's `cors_origins` env not including frontend origin)

## Ambiguity resolution meta-prompt

> The spec is silent or contradictory on [QUESTION].
>
> Walk through:
>
> 1. **Where I looked.** Cite the spec sections checked. Confirm no answer.
> 2. **Precedent.** What does the backend do in an analogous case? What does the design system imply?
> 3. **Adjacent decisions.** What did we already decide that constrains this?
> 4. **Three options.** A, B, C — with brief pros/cons.
> 5. **Recommendation.** Which one I'd pick, why.
> 6. **Fallback.** If you disagree, what's the cheapest path back.
>
> Then I'll log the choice in `DECISION_LOG.md` and the question's resolution in `OPEN_QUESTIONS.md`. Continue or wait for your call.

## Context recovery meta-prompt

> I'm resuming work after a break or compaction. Re-orient me:
>
> 1. Read `BUILD_PROGRESS.md` — what's the active phase, what's complete, what's next.
> 2. Read the last 10 entries of `CHANGELOG.md` — recent shipped work.
> 3. Read `DECISION_LOG.md` last 5 entries — recent non-obvious calls.
> 4. Read `OPEN_QUESTIONS.md` — anything blocking.
> 5. Run `git log -10 --oneline` — recent commits.
> 6. Run `pnpm test && pnpm typecheck && pnpm lint` — confirm state is green.
> 7. Read the active phase prompt in this file.
> 8. Read the spec sections cited by the active phase.
>
> Then summarize in chat: what was last done, what's next, anything I'm uncertain about.

## Refactor meta-prompt

> I want to refactor [TARGET]. Before any code:
>
> 1. **Why.** What's the pain that justifies the refactor? (Duplication / leaky abstraction / inconsistent patterns / performance / new requirement makes current shape wrong.)
> 2. **Scope.** Which files? Estimate (S < 5 files / M 5–15 / L 15+).
> 3. **Risk.** What can break? What tests cover the surface?
> 4. **Sequence.** Smallest commits in order. Don't blow it up — strangler-fig.
> 5. **Stop conditions.** When do I bail? (Tests start failing in unrelated areas, scope creep beyond the original target.)
> 6. **Rollback.** If this turns out worse, can I revert cleanly? (Yes if commits are small and reverts cleanly.)
>
> Wait for approval before touching code. Refactors that "while I'm here" expand are forbidden.

## API drift recovery meta-prompt

> The backend changed. Some of our generated types are out of date. Sequence:
>
> 1. **Confirm the change.** Pull backend latest. Inspect the diff in `app/api/v1/*.py` and `app/domain/*/schemas.py`.
> 2. **Regenerate.** `pnpm types:generate`. Inspect `git diff generated/api.d.ts`.
> 3. **Find the fallout.** `pnpm typecheck` will show every call site that broke.
> 4. **Triage.** Group fallout by domain (auth, cart, checkout, orders). Prioritize critical paths.
> 5. **Fix.** Update consumers in dependency order: types alias → query/mutation hooks → components → pages.
> 6. **Test.** Run unit + component + relevant E2E.
> 7. **Commit.** `feat(api): regenerate types from backend@<sha>` with the fallout listed in the body.

---

# Part 5 — Templates & What Else to Add

## BUILD_PROGRESS.md template

```markdown
# Build Progress

> Persistent state between sessions. Update at every phase boundary.
> If you can't tell what's next from this file, it's wrong — fix it.

## Current state
- **Active phase:** Phase X — Name _(in progress / complete)_
- **Status:** in progress (or complete; or blocked)
- **Last session:** YYYY-MM-DD
- **Sub-phases done:** ...
- **Next session should:** specific action.

## Phases

- [x] Phase 0 — Spec Comprehension & Master Plan _(done YYYY-MM-DD)_
- [x] Phase 1 — Project Foundation _(done YYYY-MM-DD)_
- [ ] Phase 2 — Design System Implementation
- [ ] Phase 3 — API Client + Type Generation
- ... etc ...

## Smoke test recipes

> Concrete commands that prove the system works at each milestone.

### After Phase 1

```bash
pnpm install
pnpm dev &
curl localhost:3000/api/health
# → {"status":"ok","version":"0.1.0"}
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### After Phase 5

```bash
# backend running on :8000 with fake SMS
pnpm dev
# Browse /ru/auth/otp, request OTP, find code in backend log, verify
# Browse /ru/account, see profile
# Add an address, see it saved
```

### After Phase 9 (full J-01)

```bash
# Fresh user flow
# Browse homepage → click symptom → click product → add to cart → cart → checkout → place order → see confirmation
```

## Backlog (Phase 1.5+)

- Address geocoding for delivery distance estimate
- Saved payment methods
- A/B testing infrastructure
- ...
```

## DECISION_LOG.md template

```markdown
# Decision Log

> Non-obvious choices and their rationale. Future-you should understand why
> something was done a particular way without re-deriving. **Append-only.**

## Format

### YYYY-MM-DD — Short title
**Phase:** N
**Context:** What was the situation?
**Decision:** What was chosen?
**Alternatives considered:** What else was on the table?
**Rationale:** Why this one?
**Trade-offs:** What did we lose by choosing this?
**Reversibility:** Easy / hard / one-way
**References:** Spec section(s) or PR

---

### 2026-XX-XX — Two-repo, not monorepo
**Phase:** 0
**Context:** Storefront and admin are two separate apps consuming same backend.
**Decision:** Two separate repos (`nookat-storefront` + `nookat-admin`); duplicate the few overlaps for MVP.
**Alternatives considered:** Turborepo monorepo with shared `packages/`.
**Rationale:** Simpler ops, smaller bundles, separate auth concerns; we're not yet at the scale where shared-code overhead exceeds duplication overhead.
**Trade-offs:** When design tokens evolve, two updates needed. We'll revisit at Phase 1.5.
**Reversibility:** Easy — promote to a published `@nookat/shared` package later.
**References:** FRONTEND_BLUEPRINT §3.

---
```

## CHANGELOG.md template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- ...

### Changed
- ...

### Fixed
- ...

## [0.1.0] - YYYY-MM-DD

### Added
- Phase 1: Next.js 15 foundation, Tailwind, shadcn, ESLint, Prettier, Husky, CI.
- /api/health endpoint.
- Docker multistage build.
```

## OPEN_QUESTIONS.md template

```markdown
# Open Questions

> Unresolved ambiguities. Each has a proposed default; close when answered.

## Format

### Q-N: Short title
**Raised:** YYYY-MM-DD (Phase X)
**Question:** ...
**Proposed default:** ...
**Why it matters:** ...
**Decision:** (filled when resolved with date + reference)

---

### Q-1: Branch picker UX
**Raised:** 2026-XX-XX (Phase 0)
**Question:** Single branch hardcoded in storefront vs. UI affordance for branch selection?
**Proposed default:** Hardcoded `branch_id=1` in storefront for MVP. About page mentions "Аптека в Ноокате" — single, real. Phase 2 of roadmap may add a picker.
**Why it matters:** Affects every `/categories/products` and `/search` call signature. Backend already supports multi-branch reads via `branch_id` query param.
**Decision:** _(open)_

### Q-2: PWA scope
**Raised:** 2026-XX-XX (Phase 0)
**Question:** Ship a PWA manifest + favicons for MVP?
**Proposed default:** Yes manifest + favicons + theme-color. No service worker (offline mode is non-trivial; defer).
**Why it matters:** Add-to-home-screen on Android improves repeat visit retention.
**Decision:** _(open)_
```

## RISKS.md template

```markdown
# Risks

> Active risks with mitigation status. Closed risks moved to ARCHIVED section.

## Format

### R-N: Short title
**Raised:** YYYY-MM-DD (Phase X)
**Description:** What's the risk?
**Likelihood:** low / medium / high
**Impact:** low / medium / high
**Mitigation:** What we're doing.
**Status:** monitoring / mitigated / accepted

---

### R-1: Backend OpenAPI drift
**Raised:** 2026-XX-XX (Phase 0)
**Description:** Backend evolves; frontend types drift. Manual updates miss things.
**Likelihood:** high (over time)
**Impact:** medium (TypeScript catches most; runtime mismatches possible)
**Mitigation:** `pnpm types:check` in CI fails the build on drift. Backend bumps trigger a frontend regeneration commit.
**Status:** mitigated

### R-2: KG audience network reality
**Raised:** 2026-XX-XX (Phase 0)
**Description:** Customers in Nookat / rural Osh have variable 3G/4G. Bundle size matters.
**Likelihood:** high
**Impact:** medium
**Mitigation:** Strict performance budget (180 KB JS gz), Lighthouse CI gate, Coolify on local VPS (latency).
**Status:** monitoring

### R-3: Brand-name change later
**Raised:** 2026-XX-XX (Phase 0)
**Description:** Owner may rebrand from "Nookat".
**Likelihood:** low (but acknowledged at kickoff)
**Impact:** low (with discipline)
**Mitigation:** Single source of truth (`lib/brand.ts` + `messages/*.json` + `public/brand/`). Code review gate: no literal "Nookat" outside those.
**Status:** mitigated
```

## What else to add as the project matures

These are post-MVP additions that will come up — capture in `BUILD_PROGRESS.md > Backlog` so they're not forgotten.

### After Phase 12 (storefront launch)

- **Analytics integration.** Plausible (privacy-friendly) or Yandex.Metrica (KG-relevant). Hook the events from PRODUCT §22.7.
- **A/B testing.** Statsig or homegrown via cookies. First experiment: pickup vs delivery default on checkout.
- **Service worker.** Cache the homepage + brand assets for repeat visit speed.
- **Real photography.** Replace typography-led heroes with shot product photos as catalog grows.
- **Push notifications.** Order status updates for repeat customers.

### After Phase A6 (admin launch)

- **Admin dashboard with KPIs.** Today's orders, low stock, near-expiry, revenue YTD.
- **Bulk actions on orders.** Confirm 20 orders at once.
- **Picking list printable view.** PDF of items to grab from shelves, sorted by location code.
- **Real-time updates.** WebSocket or SSE for queue (new orders flash in).

### Cross-cutting

- **`@nookat/shared` package.** When duplication between storefront and admin starts hurting (~Phase 1.5).
- **i18n key extraction tool.** Static analysis to find hardcoded strings.
- **Visual regression on every PR.** Currently key surfaces only; expand.
- **Lighthouse on every page.** Currently homepage + PDP only; expand.

### Operational maturity

- **Status page** (BetterStack, Statuspal). Customer-facing if downtime impacts trust.
- **On-call rotation** when team grows.
- **Postmortem template** — first incident.

### When the brand evolves

- **Rebrand.** Per DESIGN §20 — should be 4–5 file edits if discipline held.
- **Multi-branch.** Branch picker in header; geolocation-aware default.
- **Multi-currency.** If Nookat ever crosses borders. Backend types support `currency`; frontend already passes through.

---

*This document is the script for building Nookat's frontend. Re-read on every session start. Update phase-by-phase. Future Claude sessions and future humans depend on it.*
