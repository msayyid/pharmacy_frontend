# Contributing — Nookat Storefront

> Local setup, conventions, verification gate. Phase 12 deliverable.

## Prerequisites

- **Node 20** (matches `Dockerfile` + CI). `nvm install 20` if you don't have it.
- **pnpm 10.33.2** (pinned via `packageManager` in `package.json`). `corepack enable && corepack prepare pnpm@10.33.2 --activate`.
- **Docker Desktop** (or Docker engine + compose). Used for the backend dependency containers and for storefront image smoke.
- **Playwright browsers** for E2E: `pnpm e2e:install`.

## First-time setup

```bash
git clone https://github.com/msayyid/pharmacy_frontend
cd pharmacy_frontend
pnpm install
cp .env.example .env.local         # then edit with your values
```

## Running locally

```bash
# Storefront only (no backend):
pnpm dev                            # serves on :3000

# With backend (recommended for any auth/cart/checkout work):
# In a separate terminal, follow pharmacy_backend's README:
#   docker compose up -d            # MySQL + Redis
#   make migrate
#   make dev | tee /tmp/backend.log
#
# Then: pnpm dev
```

## The verification gate

You **must** pass this gate before declaring any task complete. CLAUDE.md prohibits "this should work" — code must be run.

```bash
pnpm lint                           # ESLint, zero errors
pnpm typecheck                      # tsc --noEmit, zero errors
pnpm test --run                     # Vitest, all green
pnpm i18n:check                     # ru/ky/en parity
pnpm build                          # Next production build
pnpm build:ci                       # Strips .env.local; mirrors CI
pnpm e2e --project chromium --grep-invert @requires-backend
                                    # CI gate (no backend needed)
pnpm launch:check                   # Phase 12 grep gates
```

For phase boundaries, also:

```bash
docker build -t nookat-storefront:dev .
docker run -d --rm -p 3001:3000 \
  -e API_URL=http://localhost:8000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
  --name nookat-test nookat-storefront:dev
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/health   # 200
curl -sI http://localhost:3001/ru | grep -iE 'x-frame|referrer|permissions' # security headers
docker stop nookat-test
```

## Conventional Commits

Format: `type(scope): subject`. Subject ≤ 70 chars. Body explains **why**, not what.

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `chore`, `ci`.

Scopes: `auth`, `cart`, `checkout`, `catalog`, `pdp`, `orders`, `i18n`, `seo`, `a11y`, `perf`, `observability`, `infra`, `deps`, `legal`, `launch`.

Examples:

```
feat(auth): add OTP flow with refresh interceptor
fix(cart): preserve guest cart on locale switch
refactor(api): extract error parser to lib/api/errors.ts
test(checkout): cover idempotency conflict path
docs(adr): record decision to use Coolify over Vercel
build(deps): bump @sentry/nextjs to 8.x
```

Reference feature IDs and spec sections in the body. Reference `OPEN_QUESTIONS.md OQ-NN` when the change touches a logged ambiguity.

**No AI attribution lines.** No `Co-Authored-By: Claude...`, no `🤖 Generated with Claude Code`. Commits are authored as `msayyid <201980620+msayyid@users.noreply.github.com>` (the local repo config is pinned).

## Branching

- `main` — production-ready. Coolify auto-deploys. Phase-boundary tags land here (`v0.N.0`).
- `staging` — staging deploy track (when configured).
- Feature branches: `feat/<scope>-<short-name>`. Squash-merge on PR.

Never force-push `main`. Never skip pre-commit hooks (`--no-verify`) without an explicit user instruction.

## Code conventions

See `specs/DESIGN_BLUEPRINT.md §21` (Conventions checklist) and `specs/FRONTEND_BLUEPRINT.md §21` (Code conventions). High-priority rules:

1. **No raw hex / px / spacing in components.** Tokens only.
2. **No literal "Nookat" in code.** Use `BRAND.name` (TS) or `t("brand.name")` (UI).
3. **No hardcoded user-visible strings.** Add the i18n key first; mirror to all three locales.
4. **No `confirm()` / `alert()`.** Use shadcn `Dialog` / `AlertDialog`.
5. **No `dangerouslySetInnerHTML` for backend text.** JSON-LD scoped exception in `lib/seo/jsonld.tsx` (DECISION_LOG D11 Phase 11).
6. **RSC by default.** `"use client"` is justified per occurrence; document why in a comment.
7. **One feature per branch. One reason per commit.**

## Adding an i18n key

```bash
# In all three files, sorted alphabetically by family:
messages/ru.json
messages/ky.json
messages/en.json

# Verify parity:
pnpm i18n:check

# RU is canonical; KY may be best-effort until pharmacist review;
# EN may be machine-translated until human review (both pre-launch).
```

## Adding a new top-level dependency

1. Real reason needed. Log it in `DECISION_LOG.md` with the date.
2. Run `pnpm audit` after adding.
3. Update `.env.example` if the dep introduces new env vars.

## Working with `generated/api.d.ts`

Never edit by hand. Regenerate:

```bash
pnpm types:generate                 # against live backend
pnpm types:check                    # CI-style: fail if drift from openapi.json snapshot
```

When backend bumps, update both `openapi.json` (snapshot) and `generated/api.d.ts` in the same commit:

```
feat(api): regenerate types from backend@<sha>
```

## Where things live

| Question              | File                                         |
| --------------------- | -------------------------------------------- |
| What we're building   | `specs/PRODUCT_BLUEPRINT.md` (when it lands) |
| Design language       | `specs/DESIGN_BLUEPRINT.md`                  |
| Frontend architecture | `specs/FRONTEND_BLUEPRINT.md`                |
| Phase prompts         | `specs/FRONTEND_CLAUDE_CODE_PROMPTS.md`      |
| Project rulebook      | `CLAUDE.md`                                  |
| Current phase         | `BUILD_PROGRESS.md`                          |
| Decisions made        | `DECISION_LOG.md`                            |
| Open questions        | `OPEN_QUESTIONS.md`                          |
| Active risks          | `RISKS.md`                                   |
| Pre-launch gate       | `LAUNCH_CHECKLIST.md`                        |

## Reporting issues

GitHub Issues on this repo. Tag with `bug` / `enhancement` / `question` / `pre-launch`.

For backend issues, file at https://github.com/msayyid/pharmacy_backend (the FE never modifies the backend repo).
