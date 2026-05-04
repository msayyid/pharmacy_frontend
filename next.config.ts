import createNextIntlPlugin from "next-intl/plugin"
import withBundleAnalyzer from "@next/bundle-analyzer"
import type { NextConfig } from "next"

// Wraps the Next config with next-intl's plugin so `i18n/request.ts` is
// resolved at build time and message files become part of the bundle.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

// Bundle analyzer — opt-in via `ANALYZE=true pnpm build`. Phase 11E. Generates
// HTML reports under `.next/analyze/` for client + server + edge bundles
// so we can confirm the §17.1 budget (180 KB gz per route on customer
// storefront) at any time.
const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })

// Resolve the backend host (where product / category / branch images live)
// from NEXT_PUBLIC_API_URL at build time. Dev defaults to localhost:8000.
// Phase 6 6D: needed so `next/image` accepts `${API_URL}/static/images/**`
// thumbnail_urls returned by the storefront catalog endpoints. When backend
// Q15 (Cloudflare R2) closes and product images move off local disk, add
// the R2 hostname here as a second remotePattern.
const API_URL_FOR_IMAGES = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
  } catch {
    return new URL("http://localhost:8000")
  }
})()

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: API_URL_FOR_IMAGES.protocol.replace(/:$/, "") as "http" | "https",
        hostname: API_URL_FOR_IMAGES.hostname,
        ...(API_URL_FOR_IMAGES.port ? { port: API_URL_FOR_IMAGES.port } : {}),
        pathname: "/static/images/**",
      },
    ],
  },
  // Phase 11E security headers — FRONTEND_BLUEPRINT §18.1.
  // CSP is intentionally NOT set here per §18.1: the reverse proxy (Caddy
  // / Coolify Traefik) owns CSP because it changes per-environment more
  // often than the app build. Verified at Phase 12 staging deploy.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Block iframing — admin and customer surfaces never need to be
          // embedded by third parties.
          { key: "X-Frame-Options", value: "DENY" },
          // MIME sniffing off — Next serves typed responses, sniffing
          // can only weaken the contract.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs (which carry ?q= and search terms) to
          // third-party origins.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera / mic / geolocation are not used at MVP. Branch picker
          // (post-MVP) may need geolocation; flip then.
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ]
  },
}

export default withAnalyzer(withNextIntl(nextConfig))
