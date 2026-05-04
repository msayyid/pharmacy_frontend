# CLAUDE.md — Nookat Frontend

> Every Claude Code session reads this file first. Read it. Re-read it on resume. It is the project's rulebook.

---

## What this project is

**Nookat** — a pharmacy e-commerce web frontend for the pharmacy in Nookat, Osh region, Kyrgyzstan. Two Next.js 15 apps consuming the same FastAPI backend:

- **Storefront** — customer-facing, RU/KY/EN, mobile-first
- **Admin** — staff-facing, RU only, desktop-first, dense

You are building the **frontend**. The backend is **complete at v1.0.0-rc1** at https://github.com/msayyid/pharmacy_backend — read-only from your perspective. Never modify it.

---

## Source of truth

| Question | File |
|---|---|
| What we're building (features, journeys, business rules) | `/specs/PRODUCT_BLUEPRINT.md` |
| Visual & interaction design | `/specs/DESIGN_BLUEPRINT.md` |
| Frontend architecture (stack, structure, auth, data) | `/specs/FRONTEND_BLUEPRINT.md` |
| Phased build prompts | `/specs/FRONTEND_CLAUDE_CODE_PROMPTS.md` |
| **Backend code & API contract** | `https://github.com/msayyid/pharmacy_backend` |
| Live API surface | `${API_URL}/openapi.json` and `${API_URL}/docs` (Swagger when in dev mode) |
| Project rules and invariants (this file) | `CLAUDE.md` |
| Current phase and what's next | `BUILD_PROGRESS.md` |
| Decisions made | `DECISION_LOG.md` |
| Open questions | `OPEN_QUESTIONS.md` |
| Active risks | `RISKS.md` |

**Precedence when specs disagree:**
- **PRODUCT** wins on user-visible behaviour
- **DESIGN** wins on visual & interaction
- **FRONTEND** wins on implementation
- **BACKEND repo** wins on API contracts and data shape — never invent a response shape

Anything not in any spec is an **open question**. Log it in `OPEN_QUESTIONS.md`, propose a default, ask.

---

## Session protocol — do this every session

**At session start:**
1. Read `BUILD_PROGRESS.md` — find the active phase and what's next.
2. Read the last 5 entries of `CHANGELOG.md` and `DECISION_LOG.md`.
3. Read `OPEN_QUESTIONS.md`.
4. Run `pnpm install && pnpm test` to confirm the current state is green. If red, that's the first task.
5. Locate the active phase prompt in `FRONTEND_CLAUDE_CODE_PROMPTS.md` and re-read it.
6. Re-read the spec sections cited by the active phase prompt.
7. Skim the relevant **backend files** the phase touches (you have the URL — fetch the raw files; never guess).

**Only then start work.**

**At session end (or phase boundary):**
1. Update `BUILD_PROGRESS.md` — mark progress, note next action.
2. Update `CHANGELOG.md` — under `[Unreleased]`, in Keep a Changelog format.
3. Update `DECISION_LOG.md` — if any non-obvious decision was made.
4. Update `OPEN_QUESTIONS.md` — close resolved questions, add new ones.
5. Commit with Conventional Commits format.
6. Post a one-paragraph summary in chat: what shipped, what's next, anything blocking.

---

## Operating principles

1. **Read specs before you code.** The four blueprints are dense for a reason. When a phase prompt cites sections, read those sections in full — don't skim.
2. **Plan before you implement.** Every phase requires a written plan, approved before coding.
3. **Stay in scope.** Each phase has explicit "out of scope" items. If a thought begins with "while I'm here," stop and add to backlog.
4. **Senior engineer judgment.** If a spec instruction looks wrong, *say so* before implementing. Don't silently work around it.
5. **Test as you build, not after.** Every component gets a test, every flow gets an E2E. Tests are part of the phase.
6. **Surface ambiguity, don't paper over it.** `OPEN_QUESTIONS.md` is for this.
7. **No silent assumptions.** Defaults you invent get logged in `DECISION_LOG.md`.
8. **Run before declaring done.** Code that wasn't executed isn't done. Build it. Run it. Hit the page.
9. **Conventional Commits, always.** `type(scope): subject` — see §Commits below.
10. **Never invent API shapes.** Always fetch from `openapi-typescript` against the live backend OpenAPI. The generated types are the contract.
11. **Phase-boundary push to `main` is automatic after a green verification gate.** At every phase close, after `pnpm lint` / `typecheck` / `test` / `build` / **`build:ci`** / `e2e` / `docker` (where relevant) all return exit 0, commit with Conventional Commits and `git push origin main` without asking permission. Then create the annotated semver tag `v0.N.0` for Phase N (Phase 12 = `v1.0.0-rc1`) and push the tag. **Carve-outs that still require explicit approval:** anything red on the verification gate (stop and surface — never push partial work), `--force` / `--force-with-lease` pushes, history rewrites (filter-branch / rebase past pushed commits), branch / tag deletions, and any push to a branch other than `main`. Mid-phase commits to feature branches may push freely; mid-phase commits to `main` should not happen at all. **The local gate must approximate CI's environment** — specifically, `pnpm build:ci` must run successfully without `.env.local` and without env vars set in the developer's interactive shell. If the gate is green only because of dev-only env, **the gate is a false-green and the contract is not satisfied**. Fix CI's env injection (or remove the build-time dependency) before pushing. **Tag convention:** the Phase-N close commit gets `v0.N.0`. Follow-up CI-fix commits land on `main` between the tag and the next phase; do not retag (force-tagging burns the force-push carve-out for a cosmetic move). Future tags follow the same convention.

12. **Audit the frontend's request-construction layer before concluding the backend is wrong.** Across Phases 5 and 6, two bugs that initially looked like backend issues turned out to be FE plumbing: the i18n flat-key bug (next-intl path-separator vs. our flat-dotted JSON) and the R-D Accept-Language bug (forwarding the inbound browser header instead of the URL-segment locale). Backend bugs exist, but FE plumbing bugs are more common and easier to verify. **When the frontend behavior contradicts the spec or the data contract, audit:** (a) URL building / path params, (b) outbound headers (`Accept-Language`, `Authorization`, `Idempotency-Key`, `X-Request-ID`), (c) request body shape, (d) query-param naming and casing, (e) cookie forwarding semantics. Reproduce the failing behavior with `curl` against the backend directly with the same headers/body/path; if `curl` succeeds, the bug is on our side. Only escalate to backend after this loop fails.

13. **Read-only catalog fetchers may swallow errors and degrade to empty defaults; mutation fetchers MUST NOT.** Phase 6 6F established the pattern in `lib/api/catalog.ts`: every read-only catalog helper wraps its outbound call in `try/catch` and returns `[]` / `null` / an empty `ProductsPage` on any failure. The page renders the corresponding `EmptyState` (DESIGN §14.1) — calmer UX than a 500 error page for browse surfaces where empty-state is already designed. **This pattern is forbidden for mutation paths:** cart add/remove/update, checkout quote/place, account profile/address CRUD, OTP request/verify, logout, search submission with side effects. Mutations must let `ApiError` propagate so the consumer (TanStack Query mutation `onError`, RHF `setError`, page-level `error.tsx`) can surface a localized error message via `t(\`error.\${code}\`)` per DESIGN §15.5. The customer needs to know "your action failed, try again" — silently swallowing a mutation error is a data-integrity hazard. When in doubt: read-only `GET` on a browse surface may swallow; everything else must throw.

### Commit attribution

Every commit in this repo must be authored as `msayyid <201980620+msayyid@users.noreply.github.com>` (the local repo config is already pinned). **Never** add `Co-Authored-By: Claude...` trailers, `🤖 Generated with Claude Code` footers, or any AI-attribution line to commit messages. Conventional Commits subject + body only. If a trailer accidentally lands locally, amend before push; if it lands on the remote, ask before rewriting history.

---

## Mechanical overrides — anti-decay rules

> Principles tell you how to think. These rules tell you what to do, mechanically, every time.

### Pre-work

**Step 0 — Dead code first.** Before any structural refactor on a file >300 lines: remove unused imports, commented-out code, dead helpers, leftover `console.log()`, and TODO comments without an issue link. Commit cleanup separately.

**Re-read the file before editing.** Always. Especially after any of these:
- 10+ messages have passed in the session
- A sub-agent just ran
- A different file in the same module was edited recently
- Auto-compaction may have occurred

### Phased execution within a session

**No single response touches more than 5 files.** If a task requires more, split into sub-phases or sub-agents, and state the boundary explicitly. Multi-file changes in a single response produce inconsistencies.

**Sub-agent swarming is required for >5 independent files.** When a task fans out to many files with disjoint concerns (e.g., "audit every page for missing i18n keys"), launch parallel sub-agents — 5–8 files per agent, 1 agent per concern.

### Forced verification — before claiming complete

You are FORBIDDEN from reporting a task complete until you have:

- [ ] `pnpm test` passes (unit + component)
- [ ] `pnpm typecheck` clean (`tsc --noEmit`)
- [ ] `pnpm lint` clean (ESLint)
- [ ] `pnpm build` succeeds (Next.js production build)
- [ ] **`pnpm build:ci` succeeds** — this is `pnpm build` with `.env.local` moved aside and `process.env` stripped to a minimal `HOME` / `PATH` / `SHELL` set, mirroring the GitHub Actions runner's environment. Skipping this step makes the local gate a false-green: a developer's `.env.local` masks build-time env dependencies that CI lacks. **The phase-close push gate is not satisfied without `build:ci` exit 0.**
- [ ] For type-generation changes: `pnpm types:generate` ran and committed; `pnpm types:check` clean
- [ ] For new pages: the page renders in dev (`pnpm dev`); curl or browser-fetch confirms 200
- [ ] For new client interactions: the flow exercises end-to-end in dev (try the actual button click)
- [ ] For phase boundaries: the smoke recipe in `BUILD_PROGRESS.md` for that phase runs end-to-end against a fresh build

If a check is genuinely impossible (e.g., backend not running locally), state explicitly which check was skipped and why. **Never** say "this should work" or "the test should pass" — run it.

#### When `pnpm build:ci` fails

If the strip-env build crashes with a missing-env error (the kind that doesn't reproduce under `pnpm build` alone), the answer is **never** "add the var to `.env.local`." Three legitimate fixes, in preference order:

1. **Add the var to CI's workflow env** (`.github/workflows/ci.yml`'s top-level `env:` block) — when the var is genuinely required at build time and a CI-safe placeholder value exists. Real prod values come from the deploy environment (Coolify), not from CI; CI defaults must match `vitest.config.ts > test.env` for consistency.
2. **Refactor away the build-time env dependency** — when the value is only needed at request time. Mark the consuming route `export const dynamic = "force-dynamic"` and access env at request time so the import chain doesn't crash during `next build`'s page-data collection.
3. **Make the env field optional in the Zod schema** — last resort, only when the field is truly optional in production too. Defaulting required fields silently defeats the "fail loud on import" design and masks real misconfiguration.

The lesson: **"ran locally" ≠ "passes in CI."** Local `.env.local` is a developer convenience; CI is the contract.

### OpenAPI sync

After ANY backend version bump, before starting work:

1. Run `pnpm types:generate` to refresh `generated/api.d.ts` from the live OpenAPI.
2. Run `pnpm typecheck` to surface any breaking changes.
3. If types changed, fix ALL call sites in the same commit.
4. Commit `feat(api): regenerate types from backend@<git-sha>` with the backend SHA in the body.

Never edit `generated/api.d.ts` by hand. It is generated; treat it like a build artifact.

### Edit safety

**Re-read before AND after every edit.** The edit tool fails silently when `old_string` doesn't match. After 3 edits to the same file, re-read the whole file before continuing.

### Rename safety — TypeScript helps but doesn't catch everything

You have grep, not pure AST. When renaming a type, function, component, or constant, search **separately** for ALL of:

1. Direct references — `grep -rn "OldName"`
2. Type imports — `import type { OldName }` and `import { OldName }`
3. Generic type parameters — `<OldName>` patterns
4. JSX usage — `<OldName ` (note the space) and `</OldName>`
5. String literals — i18n keys, route paths, test IDs, Sentry tags
6. Generated files — if the rename should affect generated artifacts, regenerate
7. Tailwind/CSS — class names referencing the brand or component
8. Storybook stories (if/when added)
9. Documentation in spec files (rare; usually means the spec evolved)
10. `BUILD_PROGRESS.md` smoke recipes referencing the old name

A single grep does NOT catch all of these.

### Senior engineer override

If you spot architectural debt while working on something else — duplicated state, leaky abstractions, inconsistent patterns, a component that should be split — **propose the fix in chat**. Do **NOT** silently rewrite files outside the current phase's scope.

The bar: would a senior frontend engineer who ships Linear-quality apps reject this in code review? If yes, surface it. Capture it in `BUILD_PROGRESS.md > Backlog`. Don't fix it without approval.

### Context decay awareness

Long sessions silently compact. By message ~30, your memory of files and decisions made earlier in the session may be stale. Symptoms:

- You "remember" a prop type that turns out to differ from the actual code
- You skip re-reading because "I just looked at it"
- You're confident about a value that turns out wrong

Treat any of these as a flashing red light: re-read source before continuing.

### Tool result blindness

Tool outputs over ~50,000 characters get silently truncated. If a `grep`, `find`, or `view` returns suspiciously few hits — assume truncation. Re-run with narrower scope. State explicitly when you suspect truncation.

### File read budget

Read files in chunks for anything over 500 lines. Use `view_range=[start, end]` in 500-line windows. Most spec files in this project are 1,500+ lines.

### No fake data outside tests

Never seed development or stories with placeholder strings (`name='Test Product'`, `phone='+1234567890'`, `address='123 Test St'`). Use real Bishkek addresses (`мкр Асанбай, дом 12, кв 45`), real Cyrillic medicine names (`Парацетамол 500мг 12 таб`), real KG mobile prefixes (`+996 700`, `+996 770`, `+996 550`).

Generic placeholders hide bugs that real data exposes — Cyrillic kerning, Tailwind text-wrap, length validation, RU/KY width differences. Reach for the real data first.

### Brand name discipline

The brand name **Nookat** lives in:

1. `lib/brand.ts` — `BRAND` constant for non-translatable contexts (code, console logs, OG tags)
2. `messages/<lang>.json` — `brand.name` and `brand.tagline` keys for translatable contexts (UI text)
3. `public/brand/logo-*.svg` — visual

That is the **only** places. Never hardcode "Nookat" in a component, page, or meta tag. Always reach for `BRAND.name` (TS) or `t("brand.name")` (UI). This protects the rename protocol — see `DESIGN_BLUEPRINT §20`.

### i18n keys are law

Never hardcode user-visible strings in code. Always use `t("key")` (next-intl). If a key doesn't exist, add it to **all three** language files (`ru.json` mandatory, `ky.json`, `en.json`) BEFORE using it.

The frontend's i18n keys mirror the backend's `app/i18n/<lang>.json` for shared keys (auth, cart, checkout, error, order, product, search, sms). Frontend-only UI keys (nav, cta, etc.) are separate.

When adding a new key: check `messages/ru.json` is sorted alphabetically by family, add the key to all three files in the same commit.

### Sacred invariants — never compromised

These rules cannot be overridden by clever code or expedience.

1. **No marketing scarcity.** Never display "only N left", countdown timers, or fake urgency. (PRODUCT §3.3.)
2. **No symptom-to-prescription advice.** "Products commonly bought for headache" is fine. "Take this for that" is forbidden. (PRODUCT §3.1.)
3. **No fake "best price" / "100% authentic" claims.** Calm, factual copy only. (DESIGN §15.4.)
4. **Customer support phone always one tap away.** Header on desktop, footer everywhere, every error state. (DESIGN §15.1.)
5. **Order numbers always shown in `--text-mono`** with `PH-` prefix.
6. **Idempotency-Key required on every `POST /checkout/place`**. Generate once per submission attempt, reuse on retry.
7. **Refresh token NEVER in localStorage.** HttpOnly cookie only. Access token in memory only.
8. **No PII logged client-side.** Sentry breadcrumbs auto-redact, but don't log phone/email/address yourself.
9. **/specs/* are read-only during build phases.** Specs evolve through human decision, never silent edits.
10. **No raw hex / raw font sizes / raw spacing in components.** Tokens only. Always.

If a refactor or fix appears to require violating any of these — **stop and surface it**.

---

## Tech stack reality checks

The things easy to forget — keep them top of mind.

### Backend is **complete and read-only**

- Backend repo: `https://github.com/msayyid/pharmacy_backend`
- Branch: `main`
- Version: `v1.0.0-rc1`
- Stack: FastAPI · SQLAlchemy 2.x async · MySQL 8 · Redis · ARQ
- Three production blockers are deferred: Q13 (Nikita SMS), Q14 (Freedom Pay), Q15 (R2). Affects nothing for the frontend except: real SMS is faked in dev (OTP code logs to backend stdout), card payment in dev returns a fake redirect URL, and image storage is local-disk in dev.

You can run the backend locally:

```bash
git clone https://github.com/msayyid/pharmacy_backend
cd pharmacy_backend
make docker-up   # MySQL + Redis
make dev         # API on :8000
```

**Find the OTP code in the uvicorn log** when testing OTP flow (search for `sms_enqueued`).

### Next.js 15 + App Router

- **RSC by default.** Adding `"use client"` is a deliberate choice; document why.
- `app/` directory is the source of truth for routes.
- `loading.tsx` and `error.tsx` per route segment.
- `revalidate` exports drive ISR; `force-dynamic` for cart/checkout/orders.
- Server Components can fetch directly with `fetch()`. Client Components use TanStack Query.
- Image: always `next/image` with `sizes` attribute.

### TypeScript strict

`tsconfig.json`:
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

No `any`. No `@ts-ignore`. Use `unknown` and narrow.

### Tailwind 4 + design tokens

- Brand tokens live in `globals.css` as CSS custom properties.
- `tailwind.config.ts` exposes them as Tailwind classes (`bg-brand-500`, `text-ink-900`).
- **Never** use raw hex in components.
- Class names are sorted by `prettier-plugin-tailwindcss` automatically.

### shadcn/ui

- Components are **copy-paste owned**. They live in `components/ui/`. We modify them when needed.
- Adding a shadcn component: `npx shadcn@latest add <component>`. Then customize.
- Underneath: Radix UI primitives. Accessibility defaults are good.

### TanStack Query v5

- One `QueryClient` per app, configured in `app/providers.tsx`.
- Query keys are arrays: `["product", slug, lang]`.
- Mutations call `queryClient.invalidateQueries` on success.
- Default `staleTime: 60_000` keeps things stable; per-query overrides for hotter / colder data.

### next-intl

- `app/[locale]/...` segment for storefront.
- `messages/<lang>.json` files mirror backend's i18n shape.
- Server: `getTranslations`. Client: `useTranslations`.
- Locale resolution: URL > user pref > cookie > Accept-Language > default `ru`.

### Forms: react-hook-form + Zod

- Zod schema in `<form>/schema.ts`.
- `useForm({ resolver: zodResolver(schema) })`.
- Inline errors below fields.
- API errors mapped to RHF errors via `setError`.

---

## Domain reality checks

Pharmacy-specific rules that, if forgotten, ship a broken product.

### Stock truth on every product surface

- `is_in_stock: boolean` from API drives the StockPip and CTA.
- Out-of-stock products are listed (not hidden) with disabled CTA. Substitutes block prominently.
- **Never** display stock counts ("only 2 left").

### Snapshot immutability

`order_items` carries snapshot fields (`product_name_snapshot`, `product_sku_snapshot`, etc.). The frontend displays whatever the API returns — it's frozen at order time. Don't refetch product detail to override the order line; the snapshot IS the order.

### Idempotency-Key on place_order

```ts
// On the checkout form mount:
const [idempotencyKey] = useState(() => crypto.randomUUID())

// On every submission attempt (including retries after network failure):
apiClient.POST("/api/v1/checkout/place", {
  body,
  headers: { "Idempotency-Key": idempotencyKey },
})

// Same key on retry. New form submission = new key.
```

### Cart cookie

The backend sets `pharmacy_cart_session` (HttpOnly, 30-day) for guest carts. Browsers send it automatically on same-origin requests.

- Use `credentials: "include"` on cart calls.
- On login, the backend's verify endpoint merges the guest cart automatically.
- Cart can have user OR session_id, never both.

### Order state machine

```
pending → confirmed → preparing → (ready_for_pickup | out_for_delivery) → delivered
                                                                              ↓
                                                                          refunded
                  ↓
              cancelled (from any pre-delivered state)
```

Anything else is a backend bug. The frontend just displays the status using the i18n key (`order.status.<state>`).

### Auth flow gates

- **Soft gate (most pages):** browse without login. Cart works for guests.
- **Hard gate (account, orders, addresses):** middleware redirects to `/[locale]/auth/otp` if no valid token.
- **Conversion gate:** "Place order" requires login. The OTP flow appears as a step in checkout when needed.

### Phone number format

- Display: `+996 700 12 34 56` (E.164 grouped).
- Storage: E.164 (`+996700123456`).
- Use `libphonenumber-js` for parse/format/validate. Default region: `KG`.

### Locale-aware money

- KGS, no decimal by default.
- RU/KY UI: `1 250 сом` (thin space, lowercase сом, suffix).
- EN UI: `1,250 KGS` (comma thousands, KGS suffix).
- Tabular nums always: `font-variant-numeric: tabular-nums`.

---

## File layout

See `FRONTEND_BLUEPRINT.md §4` (storefront) and `§5` (admin). Highlights:

```
nookat-storefront/
├── app/[locale]/...           # locale-prefixed routes
├── components/
│   ├── ui/                    # shadcn primitives
│   ├── product/ cart/ ...     # domain-shaped components
│   └── feedback/              # EmptyState, ErrorState
├── lib/
│   ├── brand.ts               # BRAND constant — single source for name
│   ├── api/                   # openapi-fetch client + types
│   ├── auth/ cart/ i18n/ ...  # bounded contexts
│   ├── format/                # price/date/number/phone formatters
│   └── seo/
├── messages/                  # next-intl JSON
├── generated/api.d.ts         # checked-in, regenerated from OpenAPI
└── public/brand/              # logos
```

**Layering rule:** `app/` → `components/` → `lib/` → `generated/`. Pages compose components. Components consume hooks. Only `lib/api` calls the API.

---

## Code conventions

### Naming

- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- Components: `PascalCase`
- Hooks: `useCamelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Boolean props: `isX`, `hasX`, `canX`

### Imports

Absolute imports via `@/` alias. Group order: external → `@/` → relative. ESLint sorts.

### Comments

Comments explain **why**. The diff explains **what**. Don't restate types or rephrase function names.

### Error handling

- API errors → `ApiError` class with `code`, `status`, `context`.
- Resolve message via `t(`error.${code}`)` with fallback to `t("error.generic")`.
- Inline (form fields) / Block (`ErrorState` component) / Page (`error.tsx`).
- Always offer the customer support phone in error states.

---

## Testing rules

- **Unit** (Vitest): pure functions — formatters, schemas, helpers.
- **Component** (RTL + Vitest): components in isolation, every meaningful state.
- **E2E** (Playwright): every PRODUCT §7 journey end-to-end against a running backend.
- **Visual regression** (Playwright screenshots): key surfaces at 3 breakpoints.
- **Accessibility** (axe-core): every component test runs axe; zero critical violations.

Coverage: ≥ 80% on `lib/` and `components/` for storefront, looser for admin.

---

## Persistent state files

Update at every phase boundary.

| File | Purpose |
|---|---|
| `BUILD_PROGRESS.md` | Current phase, smoke recipes, backlog |
| `DECISION_LOG.md` | Non-obvious choices and rationale |
| `CHANGELOG.md` | Human-readable history (Keep a Changelog) |
| `OPEN_QUESTIONS.md` | Unresolved ambiguities + proposed defaults |
| `RISKS.md` | Active risks with mitigation |

Templates: `FRONTEND_CLAUDE_CODE_PROMPTS.md §Templates`.

---

## Commits, PRs, branches

**Conventional Commits** — `type(scope): subject`:

```
feat(auth): add OTP flow with refresh interceptor
fix(cart): preserve guest cart on locale switch
refactor(api): extract error parser to lib/api/errors.ts
test(checkout): cover idempotency conflict path
docs(adr): record decision to use Coolify over Vercel
build(deps): bump @sentry/nextjs to 8.x
```

Body explains WHY. Reference feature IDs (`F-CART-001`) and spec sections.

One feature per branch. Squash-merge.

---

## Commands cheatsheet

```bash
# setup
pnpm install
pnpm dev                    # Next dev server :3000

# quality
pnpm lint                   # ESLint
pnpm format                 # Prettier write
pnpm typecheck              # tsc --noEmit
pnpm test                   # Vitest
pnpm test:watch
pnpm e2e                    # Playwright
pnpm build                  # Next.js production build

# API types
pnpm types:generate         # openapi-typescript ${API_URL}/openapi.json -o generated/api.d.ts
pnpm types:check            # CI-style: fail if drift

# i18n
pnpm i18n:check             # validate every key exists in all three locales

# pre-commit
pnpm pre-commit             # runs lint-staged
```

---

## Hard prohibitions — things to **never** do

1. **Never** invent API response shapes. Always derive from `generated/api.d.ts`.
2. **Never** hardcode "Nookat" in code. Use `BRAND.name` or `t("brand.name")`.
3. **Never** hardcode user-visible strings. Use i18n keys.
4. **Never** use raw hex / raw px / raw font-size in components. Tokens only.
5. **Never** put refresh tokens in localStorage. HttpOnly cookie only.
6. **Never** log PII (phone, email, address) client-side.
7. **Never** display "only N left" or marketing scarcity UX.
8. **Never** suggest medicine for symptom in prescription tone.
9. **Never** modify `/specs/*` files without explicit instruction.
10. **Never** modify `generated/api.d.ts` by hand. Regenerate.
11. **Never** use `dangerouslySetInnerHTML` without sanitization.
12. **Never** weaken `tsc --strict`, ESLint, or test coverage to "ship the phase."
13. **Never** ship a feature listed as Phase 1.5+ in PRODUCT §23 without explicit instruction.
14. **Never** add a top-level dependency without logging in `DECISION_LOG.md`.
15. **Never** commit `.env.local` or any secrets.
16. **Never** use `confirm()` or `alert()` — use shadcn Dialog or AlertDialog.
17. **Never** introduce a `<form>` without checking the iOS Safari "Done" / "Go" button behaviour.
18. **Never** modify the backend repo. It is read-only.

---

## Tool usage

### Use deep thinking when

- Designing the auth refresh flow (silent retry, race conditions)
- Choosing between RSC and client component for a flow
- Tracing a subtle hydration mismatch
- Considering deviation from a spec

### Use sub-agents (Task tool) when

- A phase has independent research streams (e.g., "audit components for missing aria-labels" + "build the new checkout form")
- You need to read the entire backend code base to plan API integration
- Two parts of the work touch disjoint files

Don't use them for sequential work or work that touches the same files.

### Use web search when

- A library version may have changed since training (Next.js, TanStack Query, next-intl, shadcn/ui)
- You're integrating something new and need current patterns
- A library error message hints at a known issue

### Use TodoWrite

At the start of every phase. Break into 6–15 trackable items.

### Reading the backend

The backend repo is at `https://github.com/msayyid/pharmacy_backend`. To read raw files:

- File URL pattern: `https://raw.githubusercontent.com/msayyid/pharmacy_backend/main/<path>`
- Examples:
  - `app/api/v1/cart.py` — cart endpoint signatures
  - `app/domain/orders/schemas.py` — order response shapes
  - `app/domain/catalog/storefront_schemas.py` — catalog response shapes
  - `app/i18n/ru.json` — backend's i18n keys (mirror these in the frontend)
  - `specs/PRODUCT_BLUEPRINT.md` — same product spec we use here

Always fetch from main branch unless instructed otherwise. Don't guess.

---

## When you're unsure

| Situation | What to do |
|---|---|
| Specs disagree | Apply precedence (PRODUCT > behaviour, DESIGN > visual, FRONTEND > impl, BACKEND > API). If still unclear, log in `OPEN_QUESTIONS.md` and ask. |
| Specs silent on a case | Add to `OPEN_QUESTIONS.md` with proposed default. Continue with default; mark as "pending confirmation" in `DECISION_LOG.md`. |
| Spec instruction looks wrong | Don't silently fix. Surface it in chat with reasoning. |
| Backend response shape doesn't match `generated/api.d.ts` | Run `pnpm types:generate`. If still mismatched, the backend changed. Update everything that consumed it. Never patch around it. |
| `pnpm types:generate` fails (backend offline) | Stop. Tell user to start backend. |
| API call returns 401 in dev | Check the access token is in memory. Check refresh cookie is present. Try logging out and back in. |
| Library behaviour differs from training data | Web search current docs. Verify with a test. |
| `str_replace` fails on `old_string` | Re-read the file. Don't retry blindly. |
| Search returns 0 hits suspiciously | Assume tool truncation. Re-run with narrower scope. |
| You can't remember if you edited a file this session | You probably did. Re-read it. |
| You feel "this should work" without running | Run it. The phrase is forbidden in completion claims. |
| You catch yourself touching a 6th file in one response | Stop. Split. State the boundary. Await approval. |
| You're tempted to fix something outside scope | Add to `BUILD_PROGRESS.md > Backlog`. Surface in chat. Don't expand scope silently. |
| Hydration mismatch in a Server Component | Check Date/Math.random/window usage. Move to client component or stabilize. |

---

## Status: where we are

> Update this section at every phase boundary. Future-you reads this first.

- **Active phase:** (Phase 0 / Phase 1 / etc. — fill in)
- **Last shipped:** (none yet — fresh repo)
- **Next milestone:** Phase 0 master plan approved → Phase 1 foundation.

For the canonical state, read `BUILD_PROGRESS.md`. This section is a pointer.

---

## When something hurts

If you find yourself:
- Pasting the same JSX in three places — extract a component.
- Adding a third special-case branch — re-think the abstraction.
- Writing a comment to explain something tricky — first try renaming things until the comment isn't needed.
- Working around a spec rather than implementing it — stop and surface.
- Skipping tests because "this part is obvious" — write the test anyway.
- Making the same decision more than once — write an ADR.
- Touching `generated/api.d.ts` by hand — stop. Regenerate.
- Hardcoding a string and "I'll i18n it later" — no, you won't. Add the key now.

---

*This file is the project's rulebook. Re-read on every session start. If something is wrong here, fix it — but log the change in `DECISION_LOG.md` and `CHANGELOG.md`. Future Claude sessions and future humans depend on it.*
