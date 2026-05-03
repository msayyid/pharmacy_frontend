import { test, expect } from "@playwright/test"

import { BRAND } from "@/lib/brand"

test("homepage renders the foundation placeholder", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/foundation phase/i)
  await expect(page.locator("h1")).toContainText(BRAND.name)
  await expect(page.getByText("Foundation phase complete")).toBeVisible()
  await expect(page.getByText("Build version 0.1.0")).toBeVisible()
})
