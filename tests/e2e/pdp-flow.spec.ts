import { test, expect } from "@playwright/test"

// PDP E2E — @requires-backend. Drives the seeded PAR-500-20 product
// (parac, manufacturer Bayer AG, 1 active ingredient, 0 images,
// is_in_stock=false at current inventory state).

test.describe("PDP", () => {
  test(
    "ru PDP renders name + manufacturer + description tabs + ingredient chip",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/products/par-500-20")
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Парацетамол 500 мг")
      await expect(page.getByText(/Bayer AG/)).toBeVisible()
      // Description tabs heading rendered.
      await expect(page.getByRole("heading", { name: /Описание/ })).toBeVisible()
      // ActiveIngredientChip routes to /search?q=<inn_name>.
      const chip = page.locator('[data-slot="active-ingredient-chip"]').first()
      await expect(chip).toBeVisible()
      await expect(chip).toHaveAttribute("href", /\/ru\/search\?q=paracetamol/)
    },
  )

  test(
    "OOS PDP renders disabled CTA with localized OOS label",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/products/par-500-20")
      // Seeded product is is_in_stock=false; CTA stays disabled with OOS copy.
      const cta = page.getByRole("button", { name: /Нет в наличии/ })
      await expect(cta).toBeVisible()
      await expect(cta).toBeDisabled()
    },
  )

  test(
    "ky PDP falls back to RU for fields lacking KY translation (design-intent)",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ky/products/par-500-20")
      // The seed has no KY translation for the product itself, so backend
      // _pick_translation falls back to RU per PRODUCT §13.1 (RU canonical).
      // Verifies R-D continues holding: Accept-Language: ky DOES reach the
      // backend (otherwise RU would be the wrong-locale-bug, not the
      // legitimate-fallback path).
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Парацетамол")
      // KY UI chrome renders: the desktop-visible Tabs surface contains
      // the localized "Колдонулушу" (indications) tab trigger.
      await expect(
        page.locator('[data-slot="tabs-trigger"]', { hasText: /Колдонулушу/ }),
      ).toBeVisible()
    },
  )

  test("PDP for unknown slug 404s", { tag: "@requires-backend" }, async ({ page }) => {
    const response = await page.goto("/ru/products/this-slug-does-not-exist")
    expect(response?.status()).toBe(404)
  })
})
