import createNextIntlPlugin from "next-intl/plugin"
import type { NextConfig } from "next"

// Wraps the Next config with next-intl's plugin so `i18n/request.ts` is
// resolved at build time and message files become part of the bundle.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

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
}

export default withNextIntl(nextConfig)
