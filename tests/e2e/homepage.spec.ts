import { test, expect } from "@playwright/test"

test("homepage at / redirects to a locale-prefixed URL", async ({ page }) => {
  // Phase 4 (D1): the next-intl middleware redirects `/` → `/<locale>` where
  // <locale> is negotiated from Accept-Language (`localeDetection: true`).
  // Different test browsers send different Accept-Language headers, so we
  // assert the redirect lands on one of the three supported locales rather
  // than pinning to /ru.
  const response = await page.goto("/")
  expect(page.url()).toMatch(/\/(ru|ky|en)\/?$/)
  expect(response?.status()).toBe(200)
  await expect(page.locator("html")).toHaveAttribute("lang", /ru|ky|en/)

  // Phase 6: header chrome is present on every storefront route. The "Cart"
  // and "Categories" labels are localized, so we assert via the link's
  // href which is locale-stable (matches /<locale>/cart, /<locale>/categories).
  await expect(page.locator("header a[href$='/cart']")).toBeVisible()
  await expect(page.locator("header a[href$='/categories']").first()).toBeVisible()
  // Phase 6: footer rendered on the homepage (sticky-bottom pattern).
  await expect(page.locator("footer")).toBeVisible()
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
