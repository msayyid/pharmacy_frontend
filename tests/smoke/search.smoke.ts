import { expect, test } from "@playwright/test"

// Phase 12C smoke. /search renders the popular-searches landing without
// a query, and renders an empty/structured result with a query.

test("/ru/search renders the popular-searches landing", async ({ page }) => {
  const response = await page.goto("/ru/search")
  expect(response?.status()).toBe(200)
  // Expect either the placeholder hint OR results UI — both are valid
  // depending on what the deployed env exposes.
  await expect(page.locator("h1").first()).toBeVisible()
})

test("/ru/search?q=пара renders results or empty-state without errors", async ({ page }) => {
  const response = await page.goto("/ru/search?q=%D0%BF%D0%B0%D1%80%D0%B0")
  expect(response?.status()).toBe(200)
  // Page has an h1 describing the query OR an empty-state heading.
  await expect(page.locator("h1, h3").first()).toBeVisible()
})
