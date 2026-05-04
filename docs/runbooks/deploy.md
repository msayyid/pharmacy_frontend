# Runbook — Deploy

> Coolify deploy procedure + rollback. Phase 12 deliverable.

## Environments

| Env        | URL                     | Backend                 | Branch    |
| ---------- | ----------------------- | ----------------------- | --------- |
| local      | `http://localhost:3000` | `http://localhost:8000` | any       |
| staging    | `staging.nookat.kg`     | `api.staging.nookat.kg` | `staging` |
| production | `nookat.kg`             | `api.nookat.kg`         | `main`    |

Admin app (separate repo): `admin.nookat.kg` and `admin.staging.nookat.kg`.

## Required env vars per environment

Coolify project → Environment Variables. Marks: `S` server-only (never sent to browser), `P` public (`NEXT_PUBLIC_*`, inlined at build time).

| Var                          | S/P | Staging                              | Production              |
| ---------------------------- | --- | ------------------------------------ | ----------------------- |
| `API_URL`                    | S   | `https://api.staging.nookat.kg`      | `https://api.nookat.kg` |
| `NEXT_PUBLIC_API_URL`        | P   | `https://api.staging.nookat.kg`      | `https://api.nookat.kg` |
| `NEXT_PUBLIC_SITE_URL`       | P   | `https://staging.nookat.kg`          | `https://nookat.kg`     |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | P   | `ru`                                 | `ru`                    |
| `NEXT_PUBLIC_ENV`            | P   | `staging`                            | `production`            |
| `SENTRY_DSN`                 | S   | `https://...@sentry.io/...`          | (different DSN)         |
| `NEXT_PUBLIC_SENTRY_DSN`     | P   | same as `SENTRY_DSN`                 | same                    |
| `SENTRY_AUTH_TOKEN`          | S   | (for source-map upload during build) | same                    |
| `SENTRY_RELEASE`             | S   | `nookat-storefront@<sha>`            | same                    |
| `NODE_ENV`                   | S   | `production`                         | `production`            |

> `NEXT_PUBLIC_*` values are baked at build time. Changing one requires a rebuild — Coolify will trigger one on env-var save when the project is configured for it.

## First-time staging setup (one-shot)

1. **Create the Coolify project.** Source: `github.com/msayyid/pharmacy_frontend`. Branch: `staging`. Build pack: Dockerfile (uses repo `Dockerfile`).
2. **Set env vars** (table above, staging column).
3. **Domain.** Bind `staging.nookat.kg` to the project. Coolify provisions TLS via its bundled Caddy/Traefik.
4. **Health check.** Coolify auto-detects the Dockerfile `HEALTHCHECK` (curl to `/api/health` every 30s). Set the deployment-fails threshold at 3 retries.
5. **Reverse proxy headers.** Add to the Caddy/Traefik config in front of the container:
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `Content-Security-Policy: <see below>` — start in `Content-Security-Policy-Report-Only` mode, monitor Sentry's CSP-violation breadcrumbs for a week, then enforce.
6. **Backend CORS.** Add `https://staging.nookat.kg` to the backend's `CORS_ALLOW_ORIGINS`. Confirm with `curl -I https://api.staging.nookat.kg/api/v1/branches -H "Origin: https://staging.nookat.kg"` — `access-control-allow-origin` should echo back.
7. **Auto-deploy on push.** Configure Coolify webhook on `staging` branch.

## Production setup (after staging is green)

Repeat with the production column. Additionally:

1. Confirm `staging.nookat.kg` has been **green for ≥ 1 week** with smoke suite passing.
2. Confirm `LAUNCH_CHECKLIST.md` is fully checked.
3. Backend's `CORS_ALLOW_ORIGINS` includes `https://nookat.kg`.
4. Real `SENTRY_DSN` (production project), real `NEXT_PUBLIC_SITE_URL`, real `API_URL`.
5. Real logo files swapped in `public/brand/` (DESIGN §20 rename protocol).
6. Real `BRAND.supportPhone`, `BRAND.licenseNumber`, `BRAND.address` filled in `lib/brand.ts`.

## Suggested CSP (start point)

> Use Report-Only first; tighten after observing real violations.

```
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://o*.ingest.sentry.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://api.nookat.kg https://*.r2.cloudflarestorage.com;
  font-src 'self' data:;
  connect-src 'self' https://api.nookat.kg https://o*.ingest.sentry.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  report-uri https://o*.ingest.sentry.io/api/<project>/security/?sentry_key=<key>
```

`'unsafe-inline'` on `script-src` is required by Next's framework runtime (nonce hardening lands when Next exposes a nonce-aware CSP helper for App Router; current 15.x doesn't expose one).

## Standard deploy (push-driven)

1. PR merge to `staging` (or `main` for prod) → Coolify webhook → build → deploy.
2. Watch Coolify's build logs for the multistage Docker build (`deps → builder → runtime`).
3. After deploy, the container's healthcheck flips to healthy when `/api/health` returns 200.
4. **Run the smoke suite:**

   ```bash
   E2E_BASE_URL=https://staging.nookat.kg pnpm playwright test tests/smoke
   ```

5. If the smoke suite is red: trigger a rollback (next section). Do NOT promote to production.

## Rollback

Coolify keeps the previous N images by default. Two paths:

### Fast path — Coolify UI rollback

Coolify dashboard → project → Deployments → previous green deployment → "Rollback to this deployment." Coolify swaps the running container back. Verify with `/api/health` + smoke suite.

### Code path — git revert

If the bad change has been merged and you don't want to keep it on `main`:

```bash
git revert <bad-commit-sha>
git push origin main
```

Coolify auto-deploys the revert. This preserves history (vs `git reset --hard` + force-push, which is forbidden on `main` per CLAUDE.md and would bypass the revert audit trail).

## After rollback

1. Update `RISKS.md` with what went wrong + the rollback action.
2. If the failure was a backend regression — flag to backend team via GitHub issue on `pharmacy_backend`.
3. If the failure was caught only at staging (not in CI gate) — add a regression test before retrying the deploy.

## Build env mismatch failure mode

If `next build` succeeds locally but Coolify's build fails with `ZodError: Invalid input: expected string, received undefined` — env vars missing from Coolify project. Fix is **never** "make the field optional in the Zod schema"; per CLAUDE.md OP, set the env var in Coolify or refactor the consuming route to `dynamic = "force-dynamic"` so env reads at request time.

## CSP refinement workflow

1. Deploy with `Content-Security-Policy-Report-Only`.
2. Browse / use the staging site for a week (FE team uses staging for QA in this period).
3. Sentry → CSP Reports panel → review violations. Most will be analytics or third-party iframes; we have neither at MVP, so the noise floor should be low.
4. Tighten the policy iteratively (`'unsafe-inline'` → nonce-based when Next supports it; remove sources that no real surface uses).
5. Switch to enforcing `Content-Security-Policy` after a clean week.

## Disaster scenarios

- **VPS down:** Coolify health-check fails → Coolify alert → page operator. Spin up the disaster-recovery VPS (procedure in backend's `pharmacy_backend/docs/runbooks/`). DNS A-record swap to DR VPS.
- **Coolify itself down:** SSH to VPS → `docker compose -f /var/lib/coolify/storage/services/<id>/docker-compose.yml up -d` to manually start the container.
- **Cert expired:** Caddy/Coolify Traefik auto-renews. If renewal fails: check Coolify logs for ACME errors; usually DNS misconfiguration. Fall back: `caddy reload --config /etc/caddy/Caddyfile.fallback` with hardcoded cert.
