#!/usr/bin/env bash
# pnpm build:ci — run `pnpm build` in an environment that mirrors GitHub
# Actions exactly. .env.local is moved aside so Next.js doesn't auto-load
# it (CI has no .env.local); process.env is reset to a minimal HOME / PATH
# / SHELL set; then the same env vars the CI workflow injects are added
# back. Net effect: this script's env ≡ CI's env. If `pnpm build:ci`
# passes locally, CI will pass.
#
# Phase 3 origin: commit fd4c608's CI build hit a ZodError on /api/diag
# because lib/env/server.ts parses env at module load and CI had no
# API_URL injected. Local `pnpm build` masked the bug because .env.local
# was present. This script + the CI workflow env: block close that gap.
#
# CLAUDE.md > Forced verification — before claiming complete, item:
# "pnpm build:ci must succeed".
#
# IMPORTANT: keep the env-injection block below in lock-step with
# .github/workflows/ci.yml's top-level env: block. When one changes, the
# other MUST change too. Real prod values come from the deploy environment
# (Coolify), never from this script or CI.

set -euo pipefail

ENV_LOCAL=".env.local"
ENV_BACKUP=".env.local.build-ci.bak"

restore_env() {
  if [ -f "$ENV_BACKUP" ]; then
    mv "$ENV_BACKUP" "$ENV_LOCAL"
  fi
}

trap restore_env EXIT INT TERM

if [ -f "$ENV_LOCAL" ]; then
  mv "$ENV_LOCAL" "$ENV_BACKUP"
fi

# Strip env to the minimum + add back the CI workflow's defaults. KEEP IN
# SYNC with .github/workflows/ci.yml top-level env: block.
#
# IMPORTANT: do NOT use `exec` here. `exec` replaces the script's shell
# with the env binary, which discards the trap registered above and leaves
# .env.local stashed in .env.local.build-ci.bak forever. We want the trap
# to fire on script exit, so run as a child process and capture exit code.
env -i \
  HOME="$HOME" \
  PATH="$PATH" \
  SHELL="${SHELL:-/bin/bash}" \
  NEXT_PUBLIC_API_URL="http://localhost:8000" \
  NEXT_PUBLIC_DEFAULT_LOCALE="ru" \
  NEXT_PUBLIC_ENV="test" \
  API_URL="http://localhost:8000" \
  pnpm build
EXIT=$?

# trap restore_env runs here on EXIT
exit $EXIT
