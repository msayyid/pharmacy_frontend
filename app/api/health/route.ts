import { NextResponse } from "next/server"

import packageJson from "@/package.json" with { type: "json" }

// Health endpoint. Coolify's healthcheck hits this every 30s. Smoke
// suite (Phase 12C) verifies status:ok. We expose:
//   - status:      always "ok" when this handler runs (Next is up)
//   - version:     from package.json — useful for verifying which build
//                  Coolify is serving after a deploy
//   - environment: NEXT_PUBLIC_ENV — useful for verifying staging vs prod
//   - sha:         SENTRY_RELEASE if set (Coolify injects the git SHA);
//                  gated to non-production so prod doesn't leak the SHA
//                  publicly (smoke suites still get the version field).
//
// The handler is dynamic at request time so process.env reads are not
// frozen at build time. Without this, NEXT_PUBLIC_ENV would always read
// as the build-time value (Coolify build-time env, not runtime).

export const dynamic = "force-dynamic"

export const APP_VERSION = packageJson.version

export function GET() {
  const env = process.env.NEXT_PUBLIC_ENV ?? "development"
  const isProd = env === "production"
  const sha = process.env.SENTRY_RELEASE
  return NextResponse.json({
    status: "ok",
    version: APP_VERSION,
    environment: env,
    ...(sha && !isProd ? { sha } : {}),
  })
}
