import { test, expect } from "@playwright/test"

// Symptom browse flow E2E — tagged @requires-backend. Drives homepage →
// symptoms index → symptom landing. Uses the 5 seeded symptoms (headache,
// fever, cold, muscle-pain, heartburn).
//
// All seeded products have empty symptoms[] arrays in the seed JSON, so
// every symptom landing legitimately renders the empty-state for products
// (per OQ-17 verification deferral). The flow itself — index → landing —
// is fully exercised here.

test.describe("symptom browse", () => {
  test(
    "symptoms index renders all 5 seeded symptoms",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/symptoms")
      await expect(page.getByRole("heading", { level: 1, name: /Симптомы/ })).toBeVisible()
      // 5 symptom tiles in the seed.
      const tiles = page.locator('a[href*="/ru/symptoms/"]')
      await expect(tiles.first()).toBeVisible()
      await expect(tiles).toHaveCount(5)
    },
  )

  test(
    "clicking a symptom tile navigates to the landing page",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/symptoms")
      // Click the first tile and assert navigation; the URL slug comes from
      // the seeded data, so we only assert the URL pattern.
      await page.locator('a[href*="/ru/symptoms/"]').first().click()
      await expect(page).toHaveURL(/\/ru\/symptoms\/[a-z-]+\b/)
      await expect(page.locator('[data-slot="breadcrumb"]')).toBeVisible()
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    },
  )

  test(
    "symptom landing renders empty-state for in-stock products (seed has none)",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/symptoms/headache")
      // Symptom name surfaces (looked up from /api/v1/symptoms list per
      // OQ-18 workaround in the page code).
      await expect(page.getByRole("heading", { level: 1, name: /Головная боль/ })).toBeVisible()
      // Products list is empty in the current seed (no product-symptom links).
      await expect(page.getByText(/В этой категории пока нет товаров/)).toBeVisible()
    },
  )

  test(
    "ky symptom landing renders Kyrgyz name (R-D verification — symptoms route)",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ky/symptoms/headache")
      // Seed has KY translation for headache: "Баш ооруу".
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/Баш ооруу/)
    },
  )

  test(
    "about page renders both seeded branches in Cyrillic",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/about")
      await expect(page.getByRole("heading", { level: 1, name: /О нас/ })).toBeVisible()
      // Two seeded branches: Аптека Асанбай / Аптека Центральная. Match by
      // h2 to avoid striking the address line ("мкр Асанбай, дом 12, …")
      // that contains the same word.
      await expect(page.getByRole("heading", { level: 2, name: /Асанбай/ })).toBeVisible()
      await expect(page.getByRole("heading", { level: 2, name: /Центральная/ })).toBeVisible()
    },
  )
})
