import { expect, test } from "@playwright/test"

// Phase 12C smoke. PDP renders against deployed env. We don't pin a
// specific slug — the staging catalog might rotate. Instead, we visit
// the homepage, find the first product link, follow it, and assert the
// PDP shape.
//
// If no product links surface (catch-and-empty contract; backend dead or
// catalog empty), the test SKIPs rather than fails — smoke is checking
// that the deployment is healthy, not that the catalog has data.

test("PDP renders product name + h1 + CTA when one is reachable from /ru", async ({ page }) => {
  await page.goto("/ru")

  // Find the first product link surfacing from any browse path. Product
  // links match the route `/ru/products/<slug>`.
  const productLink = page.locator('a[href*="/ru/products/"]').first()
  if ((await productLink.count()) === 0) {
    // Try drilling into a category — homepage at first paint may show
    // categories rather than products.
    const categoryLink = page.locator('a[href*="/ru/categories/"]').first()
    if ((await categoryLink.count()) === 0) {
      test.skip(true, "No product or category links on the homepage; staging catalog may be empty")
    }
    await categoryLink.click()
    await page.waitForURL(/\/ru\/categories\//, { timeout: 10_000 })
  }

  const productOnPage = page.locator('a[href*="/ru/products/"]').first()
  if ((await productOnPage.count()) === 0) {
    test.skip(true, "No product links reachable; catalog empty")
  }
  await productOnPage.click()

  await page.waitForURL(/\/ru\/products\//, { timeout: 10_000 })
  // PDP h1 = product name.
  await expect(page.locator("h1").first()).toBeVisible()
  // Add-to-cart CTA exists (enabled or disabled depending on stock).
  await expect(
    page.getByRole("button").filter({ hasText: /(Добавить|Нет в наличии)/ }),
  ).toBeVisible()
})
