import { test, expect } from "@playwright/test"

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

// Phase 2 visual smoke test for the design-system kitchen sink. We render at
// three breakpoints and assert the page is reachable, primitives are present,
// and fonts have loaded before any visual capture.
//
// Visual-regression snapshot comparison is intentionally NOT enabled yet —
// font-rendering differences between the local Mac and the Linux CI runner
// produce noisy diffs without a Docker-pinned environment. Phase 11 wires
// the snapshot baseline in CI via a containerized renderer.
test.describe("kitchen sink", () => {
  for (const breakpoint of BREAKPOINTS) {
    test(`renders at ${breakpoint.name} (${breakpoint.width}×${breakpoint.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height })
      await page.goto("/kitchen-sink")
      await page.waitForLoadState("networkidle")
      await page.evaluate(() => document.fonts.ready)

      // The h1 confirms the page rendered.
      await expect(page.locator("h1")).toContainText(/kitchen sink/i)

      // Each primitive section's heading shows up — quick sanity that the
      // showcase is intact (catches accidental import regressions).
      const sections = ["Buttons", "Badges", "Inputs", "PriceTag", "StockPip"]
      for (const heading of sections) {
        await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible()
      }

      // At least one Cyrillic medicine label is visible (catches font-load
      // regressions where Cyrillic falls back to Times). The kitchen sink
      // renders this string in multiple places, so .first() avoids strict-mode
      // locator violations.
      await expect(page.getByText(/Парацетамол 500мг/).first()).toBeVisible()
    })
  }

  test("404s in production env", async ({ page }) => {
    test.skip(
      process.env.NEXT_PUBLIC_ENV !== "production",
      "Production gate is only verifiable when NEXT_PUBLIC_ENV=production at build time.",
    )
    const response = await page.goto("/kitchen-sink")
    expect(response?.status()).toBe(404)
  })
})
