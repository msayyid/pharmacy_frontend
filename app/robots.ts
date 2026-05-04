import type { MetadataRoute } from "next"

import { getSiteUrl } from "@/lib/seo/site-url"

// Robots policy. Phase 11A. Next App Router contract: default-export
// function returning MetadataRoute.Robots, served at /robots.txt.
//
// Public surfaces are crawlable (every locale segment, /categories,
// /symptoms, /about, /search, /products/*).
//
// Disallowed:
//   - /api/*           — server-only
//   - /api/diag        — env-gated dev-only (already 404 in prod)
//   - /_kitchen-sink   — env-gated dev-only design system page
//   - /*/account/*     — hard-gated personal data
//   - /*/orders/*      — hard-gated personal data
//   - /*/cart          — transactional, per-session state
//   - /*/checkout      — transactional, per-session state
//   - /*/auth/*        — auth flow, never useful in search
//
// Per-route `metadata.robots.index = false` is also set on those routes
// (Phase 11B) as belt-and-suspenders against well-behaved crawlers. The
// robots.txt-level disallow is the authoritative signal.

export default function robots(): MetadataRoute.Robots {
  const SITE_URL = getSiteUrl()
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/api/diag",
          "/_kitchen-sink",
          "/*/account/",
          "/*/orders/",
          "/*/cart",
          "/*/checkout",
          "/*/auth/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
