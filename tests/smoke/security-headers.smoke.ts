import { expect, test } from "@playwright/test"

// Phase 12C smoke. Security headers wired in Phase 11E next.config.ts.
// Reverse proxy (Caddy/Coolify Traefik) adds HSTS + CSP on top, which
// we verify separately if and when those are wired (CSP starts in
// Report-Only mode; see docs/runbooks/deploy.md).
//
// No assertion on CSP header here — at MVP it lives in the proxy and
// flips between Report-Only and enforced over the staging soak period.

test("response carries X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy", async ({
  page,
}) => {
  const response = await page.goto("/ru")
  expect(response).not.toBeNull()
  const headers = response!.headers()
  expect(headers["x-frame-options"]).toBe("DENY")
  expect(headers["x-content-type-options"]).toBe("nosniff")
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  expect(headers["permissions-policy"]).toContain("geolocation=()")
})

test("HSTS header is present (added by reverse proxy)", async ({ page }) => {
  // We tolerate the absence in dev/local smoke (no proxy); only require
  // it when the smoke is run against an https:// base URL — i.e. real
  // staging or production.
  const baseUrl = process.env.E2E_BASE_URL ?? ""
  test.skip(!baseUrl.startsWith("https://"), "HSTS only required behind TLS")

  const response = await page.goto("/ru")
  const headers = response!.headers()
  const hsts = headers["strict-transport-security"]
  expect(hsts).toBeTruthy()
  expect(hsts).toMatch(/max-age=\d{6,}/)
})
