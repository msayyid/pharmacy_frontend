import createNextIntlPlugin from "next-intl/plugin"
import type { NextConfig } from "next"

// Wraps the Next config with next-intl's plugin so `i18n/request.ts` is
// resolved at build time and message files become part of the bundle.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
}

export default withNextIntl(nextConfig)
