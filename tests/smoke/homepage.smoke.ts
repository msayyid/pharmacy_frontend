import { expect, test } from "@playwright/test"

// Phase 12C smoke. Homepage on the default locale (ru) renders header +
// brand mark + at least one section. We deliberately do NOT assert any
// specific copy content (the catalog might be empty in a fresh staging
// environment — OP-13 catch-and-empty contract degrades gracefully).
//
// What we DO assert:
//   - 200 response
//   - <html lang="ru">
//   - Header is present
//   - Footer is present
//   - At least one h1 visible
//   - Sacred-invariant #4: support-phone tap-to-call is reachable

test("/ru homepage renders with header + footer + h1", async ({ page }) => {
  const response = await page.goto("/ru")
  expect(response?.status()).toBe(200)

  await expect(page.locator("html")).toHaveAttribute("lang", "ru")
  await expect(page.getByRole("banner")).toBeVisible()
  await expect(page.getByRole("contentinfo")).toBeVisible()

  // Hero or first section heading.
  await expect(page.locator("h1, h2").first()).toBeVisible()

  // Sacred-invariant #4: a tel: link is on every page.
  const telLinks = page.locator('a[href^="tel:"]')
  await expect(telLinks.first()).toBeVisible()
})

test("/ root redirects to a locale-prefixed URL", async ({ page }) => {
  const response = await page.goto("/")
  expect(response?.status()).toBe(200)
  expect(page.url()).toMatch(/\/(ru|ky|en)\/?$/)
})

test("locale switch /en lands with html lang=en", async ({ page }) => {
  const response = await page.goto("/en")
  expect(response?.status()).toBe(200)
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
})
