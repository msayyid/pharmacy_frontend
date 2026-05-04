import { test, expect } from "@playwright/test"

// Search flow E2E — @requires-backend. Drives the /search route and the
// header SearchInput / SearchSuggest. Backend must be seeded.

test.describe("search route", () => {
  test("/ru/search with no q → too_short hint", { tag: "@requires-backend" }, async ({ page }) => {
    await page.goto("/ru/search")
    await expect(page.getByText(/Введите минимум 2 символа/)).toBeVisible()
  })

  test(
    "/ru/search?q=пар → results header echoes the query",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru/search?q=пар")
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        /Результаты по запросу «пар»/,
      )
    },
  )

  test("/ru/search?q=zzzqqqxxx → empty-state", { tag: "@requires-backend" }, async ({ page }) => {
    await page.goto("/ru/search?q=zzzqqqxxx")
    await expect(page.getByText(/Ничего не найдено по запросу/)).toBeVisible()
  })
})

test.describe("header SearchInput", () => {
  test(
    "typing in the SearchInput → debounced suggest call → dropdown renders",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru")
      const input = page.locator('[data-slot="search-input"] input')
      await expect(input).toBeVisible()
      await input.fill("пар")
      // SearchSuggest dropdown appears (250ms debounce + suggest fetch).
      await expect(page.locator('[data-slot="search-suggest"]')).toBeVisible({
        timeout: 5_000,
      })
    },
  )

  test(
    "Enter on the SearchInput navigates to /search?q=<value>",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru")
      const input = page.locator('[data-slot="search-input"] input')
      await input.fill("парацетамол")
      await input.press("Enter")
      await expect(page).toHaveURL(/\/ru\/search\?q=/, { timeout: 5_000 })
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        /Результаты по запросу «парацетамол»/,
      )
    },
  )

  test(
    "Escape on the SearchInput closes the dropdown",
    { tag: "@requires-backend" },
    async ({ page }) => {
      await page.goto("/ru")
      const input = page.locator('[data-slot="search-input"] input')
      await input.fill("пар")
      await expect(page.locator('[data-slot="search-suggest"]')).toBeVisible({
        timeout: 5_000,
      })
      await input.press("Escape")
      await expect(page.locator('[data-slot="search-suggest"]')).not.toBeVisible()
    },
  )
})
