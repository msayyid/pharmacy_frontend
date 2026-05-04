import { clientEnv } from "@/lib/env/client"

// Canonical site URL helper. Phase 11A.
//
// Production: https://nookat.kg (BRAND.domain). Staging overrides via
// NEXT_PUBLIC_SITE_URL when wired (Phase 12 / Coolify deploy). Falls back
// to the API URL's origin in dev so locale-prefixed canonical URLs render
// usefully even without staging configured.
//
// Used by sitemap.ts, robots.ts, generateMetadata blocks, and JSON-LD
// helpers. Centralized here so the canonical-host policy lives in one
// place — see DECISION_LOG D-? for the precedence order.

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, "")
  try {
    return new URL(clientEnv.NEXT_PUBLIC_API_URL).origin
  } catch {
    return "http://localhost:3000"
  }
}

export function buildLocalizedAlternates(
  path: string,
  locales: readonly string[],
): { canonical: string; languages: Record<string, string> } {
  const siteUrl = getSiteUrl()
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    languages[locale] = `${siteUrl}/${locale}${path}`
  }
  return {
    canonical: `${siteUrl}/${locales[0]}${path}`,
    languages,
  }
}
