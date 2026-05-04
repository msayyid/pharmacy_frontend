import { test, expect } from "@playwright/test"

// Cart flow E2E — @requires-backend. Drives the J-01 cart half:
// browse → add-to-cart from category page (not PDP — backend's PDP
// `is_in_stock` reads from a different code path than the catalog
// list, so PDP CTA tests as disabled-OOS) → toast → drawer → /cart →
// qty stepper → remove.
//
// Requires the Phase 8 smoke fixture: branches id=1 row + branch_products
// rows mirrored from branch_id=3 (see BUILD_PROGRESS.md Phase 8 smoke
// recipe). Without the fixture, all products read as OOS and the
// AddToCartButton stays disabled.

test.describe("cart flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
  })

  test(
    "add-to-cart from category page → toast + cart-icon badge",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/categories/pain-relief")
      // Locate an enabled AddToCartButton.
      const cta = page.locator('[data-slot="add-to-cart-button"]:not([disabled])').first()
      await expect(cta).toBeVisible()
      await cta.click()

      // Sonner toast appears with the localized success copy.
      await expect(page.getByText(/Добавлено в корзину/)).toBeVisible({
        timeout: 5_000,
      })

      // Cart-icon badge should reflect 1 distinct line item. Header has
      // both mobile and desktop variants — at default Playwright
      // viewport (1280×720) the desktop badge shows.
      await expect(page.locator('[data-slot="cart-badge"]').first()).toHaveText("1", {
        timeout: 5_000,
      })
    },
  )

  test(
    "/cart page renders the added line + totals + checkout CTA",
    { tag: "@requires-backend" },
    async ({ page }) => {
      // Add as guest first.
      await page.goto("/ru/categories/pain-relief")
      await page.locator('[data-slot="add-to-cart-button"]:not([disabled])').first().click()
      await expect(page.getByText(/Добавлено в корзину/)).toBeVisible({
        timeout: 5_000,
      })

      await page.goto("/ru/cart")
      await expect(page.getByRole("heading", { level: 1, name: /Корзина/ })).toBeVisible()
      await expect(page.locator('[data-slot="cart-line"]').first()).toBeVisible()
      await expect(page.locator('[data-slot="cart-totals"]')).toBeVisible()
      // Checkout CTA links to /checkout (Phase 9 placeholder).
      const checkoutCta = page.getByRole("link", { name: /Оформить заказ/ })
      await expect(checkoutCta).toBeVisible()
      await expect(checkoutCta).toHaveAttribute("href", /\/ru\/checkout/)
    },
  )

  test(
    "QuantityStepper update + Remove → cart updates without reload",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/categories/pain-relief")
      await page.locator('[data-slot="add-to-cart-button"]:not([disabled])').first().click()
      await expect(page.getByText(/Добавлено в корзину/)).toBeVisible({
        timeout: 5_000,
      })

      await page.goto("/ru/cart")
      const incrementButton = page.locator('[data-slot="quantity-stepper"] button').nth(1)
      await incrementButton.click()
      // Optimistic display + debounce + server-roundtrip → quantity reflects 2.
      await expect(page.locator('[data-slot="quantity-stepper"] input').first()).toHaveValue("2", {
        timeout: 3_000,
      })

      // Remove via the trash button (aria-label = "Удалить").
      const removeButton = page.getByRole("button", { name: /^Удалить$/ }).first()
      await removeButton.click()

      // Cart empties → EmptyState renders with the "Перейти к покупкам" CTA.
      await expect(page.getByText(/Ваша корзина пуста/)).toBeVisible({
        timeout: 5_000,
      })
    },
  )

  test(
    "PDP add-to-cart CTA tests as disabled (backend asymmetry — see OQ-24)",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/products/par-500-20")
      // PDP backend reports is_in_stock=false even when the catalog list
      // reports the same product as in-stock. The PDP's AddToCartButton
      // stays disabled until the backend reconciles its is_in_stock
      // computation across endpoints (logged as OQ-24 + Phase 8 smoke
      // finding). This test is the regression marker — when backend
      // fixes it, this expectation flips and we test add-from-PDP too.
      const cta = page.locator('[data-slot="add-to-cart-button"]').first()
      await expect(cta).toBeVisible()
      await expect(cta).toBeDisabled()
    },
  )
})
