import { test, expect } from "@playwright/test"

import { BRAND } from "@/lib/brand"

test("homepage at / redirects to a locale-prefixed URL", async ({ page }) => {
  // Phase 4 (D1): the next-intl middleware redirects `/` → `/<locale>` where
  // <locale> is negotiated from Accept-Language (`localeDetection: true`).
  // Different test browsers send different Accept-Language headers, so we
  // assert the redirect lands on one of the three supported locales rather
  // than pinning to /ru.
  const response = await page.goto("/")
  expect(page.url()).toMatch(/\/(ru|ky|en)\/?$/)
  expect(response?.status()).toBe(200)

  await expect(page).toHaveTitle(/foundation phase/i)
  await expect(page.locator("html")).toHaveAttribute("lang", /ru|ky|en/)
  await expect(page.locator("h1")).toContainText(BRAND.name)
  await expect(page.getByText("Foundation phase complete")).toBeVisible()
  await expect(page.getByText("Build version 0.1.0")).toBeVisible()
})

test("/ru direct request lands on /ru with html lang=ru", async ({ page }) => {
  const response = await page.goto("/ru")
  expect(response?.status()).toBe(200)
  await expect(page.locator("html")).toHaveAttribute("lang", "ru")
  // After visiting /ru, the NEXT_LOCALE cookie should pin subsequent /
  // requests to /ru — verifying the persistence half of D1.
  const homeResponse = await page.goto("/")
  expect(homeResponse?.status()).toBe(200)
  expect(page.url()).toMatch(/\/ru\/?$/)
})

test("/ky resolves with html lang=ky", async ({ page }) => {
  const response = await page.goto("/ky")
  expect(response?.status()).toBe(200)
  await expect(page.locator("html")).toHaveAttribute("lang", "ky")
})

test("/en resolves with html lang=en", async ({ page }) => {
  const response = await page.goto("/en")
  expect(response?.status()).toBe(200)
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
})
