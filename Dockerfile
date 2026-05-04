FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time env stubs — KEEP IN SYNC with scripts/build-ci.sh and
# .github/workflows/ci.yml top-level env block. lib/env/server.ts
# Zod-parses these at module import; missing values crash `next build`'s
# page-data collection. Real prod values come from the deploy environment
# (Coolify) at runtime. Phase 10 close: added so `docker build` mirrors
# the build:ci contract.
ENV NEXT_PUBLIC_API_URL=http://localhost:8000 \
    NEXT_PUBLIC_DEFAULT_LOCALE=ru \
    NEXT_PUBLIC_ENV=test \
    API_URL=http://localhost:8000
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Phase 12E — runtime fallback env so `docker run` smoke works without
# a `-e API_URL=...` flag (the gap surfaced in Phase 11F when sitemap.ts
# started pulling lib/env/server.ts at request time). Real deploys
# (Coolify) override these at runtime via the project's env panel; the
# fallback is for local docker smoke only.
ENV API_URL=http://localhost:8000 \
    NEXT_PUBLIC_API_URL=http://localhost:8000 \
    NEXT_PUBLIC_DEFAULT_LOCALE=ru \
    NEXT_PUBLIC_ENV=development
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
