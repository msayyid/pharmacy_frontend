import { test, expect } from "@playwright/test"

test("homepage renders the foundation placeholder", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/foundation phase/i)
  await expect(page.locator("h1")).toContainText("Foundation phase complete")
  await expect(page.locator("p")).toContainText("Build version 0.1.0")
})
