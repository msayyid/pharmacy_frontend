import { describe, expect, it } from "vitest"

import { sanitizeReturnUrl } from "@/lib/auth/return-url"

const ORIGIN = "http://localhost:3000"
const FALLBACK = "/ru/account"

function sanitize(raw: string | null | undefined) {
  return sanitizeReturnUrl({ raw, locale: "ru", origin: ORIGIN })
}

describe("sanitizeReturnUrl — happy path", () => {
  it("accepts a same-origin absolute path", () => {
    expect(sanitize("/ru/account")).toBe("/ru/account")
  })

  it("accepts a path with query params", () => {
    expect(sanitize("/ru/orders/PH-2026-000123?from=email")).toBe(
      "/ru/orders/PH-2026-000123?from=email",
    )
  })

  it("accepts non-locale paths (e.g. /api/diag is unusual but technically same-origin)", () => {
    // The middleware decides whether the user can reach a path; the sanitizer
    // only protects against open-redirect.
    expect(sanitize("/anywhere")).toBe("/anywhere")
  })

  it("preserves percent-encoded path segments", () => {
    expect(
      sanitize("/ru/products/%D0%BF%D0%B0%D1%80%D0%B0%D1%86%D0%B5%D1%82%D0%B0%D0%BC%D0%BE%D0%BB"),
    ).toBe("/ru/products/%D0%BF%D0%B0%D1%80%D0%B0%D1%86%D0%B5%D1%82%D0%B0%D0%BC%D0%BE%D0%BB")
  })
})

describe("sanitizeReturnUrl — attack vectors", () => {
  // R-F (Phase 5 plan): explicit attack input list.

  it("rejects empty / null / undefined → falls back", () => {
    expect(sanitize("")).toBe(FALLBACK)
    expect(sanitize(null)).toBe(FALLBACK)
    expect(sanitize(undefined)).toBe(FALLBACK)
  })

  it("rejects protocol-relative URL //evil.com", () => {
    expect(sanitize("//evil.com")).toBe(FALLBACK)
    expect(sanitize("//evil.com/x")).toBe(FALLBACK)
    expect(sanitize("//evil.com/x?return=/legitimate")).toBe(FALLBACK)
  })

  it("rejects backslash-prefixed \\evil.com (browser normalization attack)", () => {
    expect(sanitize("\\evil.com")).toBe(FALLBACK)
    expect(sanitize("\\\\evil.com")).toBe(FALLBACK)
  })

  it("rejects backslash anywhere in the input", () => {
    expect(sanitize("/legitimate\\evil")).toBe(FALLBACK)
    expect(sanitize("/safe\\\\..\\\\..\\evil")).toBe(FALLBACK)
  })

  it("rejects javascript: scheme", () => {
    expect(sanitize("javascript:alert(1)")).toBe(FALLBACK)
    expect(sanitize("javascript:void(0)")).toBe(FALLBACK)
  })

  it("rejects data: scheme", () => {
    expect(sanitize("data:text/html,<script>alert(1)</script>")).toBe(FALLBACK)
  })

  it("rejects absolute https://evil.com URLs", () => {
    expect(sanitize("https://evil.com/x")).toBe(FALLBACK)
    expect(sanitize("https://evil.com/x?return=/legitimate")).toBe(FALLBACK)
  })

  it("rejects absolute http://evil.com URLs", () => {
    expect(sanitize("http://evil.com")).toBe(FALLBACK)
  })

  it("rejects same-host-different-scheme via case tricks", () => {
    expect(sanitize("HTTPS://evil.com/x")).toBe(FALLBACK)
  })

  it("rejects paths that don't start with /", () => {
    expect(sanitize("ru/account")).toBe(FALLBACK)
    expect(sanitize("./account")).toBe(FALLBACK)
    expect(sanitize("../account")).toBe(FALLBACK)
  })

  it("falls back to a locale-specific path", () => {
    // Different locale → different fallback.
    expect(sanitizeReturnUrl({ raw: "//evil.com", locale: "ky", origin: ORIGIN })).toBe(
      "/ky/account",
    )
    expect(sanitizeReturnUrl({ raw: "//evil.com", locale: "en", origin: ORIGIN })).toBe(
      "/en/account",
    )
  })

  it("rejects when origin parses different from caller's origin (defensive)", () => {
    // If somehow URL parsing produces a foreign origin (path traversal,
    // CRLF injection, etc.), reject.
    expect(sanitizeReturnUrl({ raw: "//evil.com", locale: "ru", origin: ORIGIN })).toBe(FALLBACK)
  })
})
