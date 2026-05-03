import { test, expect } from "@playwright/test"

// Account-gate spec — verifies the middleware (composed next-intl + auth gate
// in middleware.ts) redirects unauthenticated users away from HARD_GATED
// routes and preserves the destination via ?return=. No backend required:
// pure Next.js middleware behavior.

test("/ru/account without auth cookie redirects to /ru/auth/otp with return URL", async ({
  page,
}) => {
  await page.context().clearCookies()
  const response = await page.goto("/ru/account")
  expect(response?.status()).toBe(200)
  expect(page.url()).toMatch(/\/ru\/auth\/otp\?return=%2Fru%2Faccount\b/)
})

test("/ru/account/addresses without auth cookie redirects with sanitized return", async ({
  page,
}) => {
  await page.context().clearCookies()
  await page.goto("/ru/account/addresses")
  expect(page.url()).toMatch(/\/ru\/auth\/otp\?return=%2Fru%2Faccount%2Faddresses\b/)
})

test("/en/orders without auth cookie redirects in EN locale", async ({ page }) => {
  await page.context().clearCookies()
  await page.goto("/en/orders")
  expect(page.url()).toMatch(/\/en\/auth\/otp\?return=%2Fen%2Forders\b/)
})

test("/ky/me without auth cookie redirects in KY locale", async ({ page }) => {
  await page.context().clearCookies()
  await page.goto("/ky/me")
  expect(page.url()).toMatch(/\/ky\/auth\/otp\?return=%2Fky%2Fme\b/)
})

test("/ru (homepage, not gated) does NOT redirect to /auth/otp", async ({ page }) => {
  await page.context().clearCookies()
  const response = await page.goto("/ru")
  expect(response?.status()).toBe(200)
  expect(page.url()).toMatch(/\/ru\/?$/)
})

test("/ru/auth/otp itself is reachable without auth (no redirect loop)", async ({ page }) => {
  await page.context().clearCookies()
  const response = await page.goto("/ru/auth/otp")
  expect(response?.status()).toBe(200)
  expect(page.url()).toMatch(/\/ru\/auth\/otp\b/)
})
