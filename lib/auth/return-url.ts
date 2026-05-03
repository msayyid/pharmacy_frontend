import type { Locale } from "@/i18n/config"

// Sanitizer for the `?return=<path>` param on the OTP page redirect.
//
// R-F (Phase 5 plan): the user's request can stuff arbitrary content into
// the `return` query, so we must defensively reject anything that could
// trigger an open-redirect or origin escape. Standard attack vectors:
//
//   //evil.com                    → protocol-relative ⇒ different origin
//   \\evil.com                    → backslash trickery (browsers normalize)
//   /legitimate\evil              → backslash mid-path
//   javascript:alert(1)           → js URL scheme
//   data:text/html,...            → data URL scheme
//   https://evil.com/...          → absolute URL different origin
//   //evil.com/x?return=/safe     → nested attack
//
// Rules:
//   1. Must be a non-empty string starting with "/".
//   2. No backslashes ANYWHERE in the input (some browsers normalize \\ to //).
//   3. No double-slash prefix ("//" → protocol-relative).
//   4. Parse via `new URL(raw, origin)`; the resulting `parsed.origin` must
//      equal the expected origin AND the resulting `parsed.pathname` must
//      start with "/".
//   5. On any mismatch, return the safe fallback.
//
// The fallback is `/<locale>/account` — it's the canonical post-login
// landing page when no return target is provided or the provided one fails
// the gate.

export interface SanitizeReturnUrlInput {
  raw: string | null | undefined
  locale: Locale
  origin: string
}

export function sanitizeReturnUrl({ raw, locale, origin }: SanitizeReturnUrlInput): string {
  const fallback = `/${locale}/account`

  if (typeof raw !== "string" || raw.length === 0) return fallback

  // Reject any backslash — browsers can normalize \\evil.com to //evil.com
  // before our URL parser sees it.
  if (raw.includes("\\")) return fallback

  // Must start with a single slash, never two (// is protocol-relative).
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback

  let parsed: URL
  try {
    parsed = new URL(raw, origin)
  } catch {
    return fallback
  }

  if (parsed.origin !== origin) return fallback
  if (!parsed.pathname.startsWith("/")) return fallback
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback

  // Reconstruct as a relative path so the caller can router.replace() safely.
  return `${parsed.pathname}${parsed.search}`
}
