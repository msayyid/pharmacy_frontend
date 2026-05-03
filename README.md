# Nookat Storefront

Customer-facing storefront for the Nookat pharmacy in Nookat, Osh region, Kyrgyzstan. Next.js 15+ App Router consuming the FastAPI backend at [`pharmacy_backend`](https://github.com/msayyid/pharmacy_backend) (`v1.0.0-rc1`). RU primary, KY + EN supported. Mobile-first.

## Where things live

- **`CLAUDE.md`** — project rulebook. Read first, on every session.
- **`MASTER_PLAN.md`** — Phase 0 deliverable: backend endpoint + i18n inventory, all 15 resolved open questions, risks, confirmed phase order.
- **`BUILD_PROGRESS.md`** — what phase, what's next, smoke recipes.
- **`OPEN_QUESTIONS.md`** — resolved Phase-0 questions + active backend asks (currently `OQ-16` for cart-merge).
- **`DECISION_LOG.md`** — non-obvious decisions with rationale.
- **`RISKS.md`** — active risks with mitigation status.
- **`CHANGELOG.md`** — Keep a Changelog format.
- **`AGENTS.md`** — `create-next-app`'s Next-version warning + redirect to `CLAUDE.md`.
- **`specs/`** — read-only: `DESIGN_BLUEPRINT.md`, `FRONTEND_BLUEPRINT.md`, `FRONTEND_CLAUDE_CODE_PROMPTS.md`.

## Local development

```bash
pnpm install
pnpm dev                # http://localhost:3000
pnpm lint               # ESLint flat config
pnpm format             # Prettier write
pnpm format:check       # Prettier check
pnpm typecheck          # tsc --noEmit
pnpm test               # Vitest run (unit + component)
pnpm test:watch         # Vitest watch
pnpm e2e                # Playwright (all browsers)
pnpm e2e --project=chromium   # Chromium only
pnpm e2e:install        # First-time Playwright browser download
pnpm build              # Next.js production build
```

The backend is expected at `http://localhost:8000` for any API-touching work (Phase 5 onward).

```bash
# Backend (separate repo, read-only):
git clone https://github.com/msayyid/pharmacy_backend ../pharmacy_backend
cd ../pharmacy_backend
make docker-up && make dev
```

## Docker

```bash
docker build -t nookat-storefront:dev .
docker run -p 3000:3000 nookat-storefront:dev
curl localhost:3000/api/health
```

The image is multistage (`node:20-alpine`), runs as the non-root `nextjs` user, and ships the Next.js standalone output. Healthcheck hits `/api/health`.

## CI

GitHub Actions runs lint, typecheck, test, build, and Chromium-E2E on every PR. Pushes to `main` and `staging` additionally run the full E2E matrix (chromium + firefox + webkit). See `.github/workflows/ci.yml`.

## License

See `LICENSE`.
