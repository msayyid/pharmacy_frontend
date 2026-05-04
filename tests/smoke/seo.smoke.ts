import { expect, test } from "@playwright/test"

// Phase 12C smoke. SEO foundation reachable on the deployed env:
//   - /sitemap.xml returns valid XML with at least the static routes
//   - /robots.txt allows /, disallows /api/ and the hard-gated transactional
//     surfaces

test("/sitemap.xml returns valid XML with locale-prefixed URLs", async ({ request }) => {
  const res = await request.get("/sitemap.xml")
  expect(res.status()).toBe(200)
  const body = await res.text()

  // Must be an XML sitemap, not HTML.
  expect(res.headers()["content-type"]).toMatch(/xml/i)
  expect(body.startsWith("<?xml") || body.includes("<urlset")).toBe(true)

  // At minimum, we expect locale-prefixed URLs. We don't pin specific
  // catalog slugs — they may be missing if the backend was unreachable
  // at build time (catch-and-empty contract).
  expect(body).toMatch(/\/(ru|ky|en)/)
})

test("/robots.txt allows / and disallows /api/", async ({ request }) => {
  const res = await request.get("/robots.txt")
  expect(res.status()).toBe(200)
  const body = await res.text()

  expect(body).toMatch(/^User-?Agent:\s*\*/im)
  expect(body).toMatch(/^Allow:\s*\//im)
  expect(body).toMatch(/^Disallow:\s*\/api\//im)

  // Hard-gated surfaces should also be disallowed.
  expect(body).toMatch(/Disallow:\s*\/\*\/cart/i)
  expect(body).toMatch(/Disallow:\s*\/\*\/checkout/i)
  expect(body).toMatch(/Disallow:\s*\/\*\/account\//i)
  expect(body).toMatch(/Disallow:\s*\/\*\/orders\//i)
  expect(body).toMatch(/Disallow:\s*\/\*\/auth\//i)

  // Sitemap reference should point at the deployed origin.
  expect(body).toMatch(/Sitemap:\s+https?:\/\/.+\/sitemap\.xml/i)
})
