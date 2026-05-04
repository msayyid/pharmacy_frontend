import { test, expect } from "@playwright/test"

// R-E gate verification (Phase 7 plan): when the user types in the
// SearchInput on /ky/*, the outbound suggest XHR must reach the backend
// with `Accept-Language: ky`. The fix lives in lib/api/client.ts
// (`createBrowserApiClient({ locale })` sets the header in its onRequest
// middleware) and lib/api/catalog.ts (server-side calls already pinned
// per Phase 6 D11).
//
// This test is permanent regression coverage. If it ever fails, the FE
// has slipped back to forwarding the browser's default Accept-Language —
// same shape of bug as Phase 6 R-D, same fix (audit createBrowserApiClient
// + getApiClientForLocale callers).

test.describe("R-E — SearchSuggest sends URL-locale Accept-Language", () => {
  test(
    "/ky search suggest call → Accept-Language: ky",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ky")
      const suggestRequest = page.waitForRequest(
        (req) => req.url().includes("/api/v1/search/suggest") && req.method() === "GET",
        { timeout: 10_000 },
      )

      const searchInput = page.locator('[data-slot="search-input"] input')
      await expect(searchInput).toBeVisible()
      await searchInput.fill("пар")

      const req = await suggestRequest
      const acceptLang = req.headers()["accept-language"]
      expect(acceptLang).toBe("ky")
    },
  )

  test(
    "/ru search suggest call → Accept-Language: ru",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru")
      const suggestRequest = page.waitForRequest(
        (req) => req.url().includes("/api/v1/search/suggest") && req.method() === "GET",
        { timeout: 10_000 },
      )

      const searchInput = page.locator('[data-slot="search-input"] input')
      await expect(searchInput).toBeVisible()
      await searchInput.fill("пар")

      const req = await suggestRequest
      const acceptLang = req.headers()["accept-language"]
      expect(acceptLang).toBe("ru")
    },
  )

  test(
    "/en search suggest call → Accept-Language: en",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/en")
      const suggestRequest = page.waitForRequest(
        (req) => req.url().includes("/api/v1/search/suggest") && req.method() === "GET",
        { timeout: 10_000 },
      )

      const searchInput = page.locator('[data-slot="search-input"] input')
      await expect(searchInput).toBeVisible()
      await searchInput.fill("par")

      const req = await suggestRequest
      const acceptLang = req.headers()["accept-language"]
      expect(acceptLang).toBe("en")
    },
  )
})
