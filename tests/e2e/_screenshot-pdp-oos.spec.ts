import { test } from "@playwright/test"

// Phase 7 close screenshot. Captures the OOS PDP path which is the
// visual moment of this phase per the user's directive — every seeded
// product is is_in_stock=false, so this is the layout we ship with at
// MVP. File is prefixed with `_` so vitest globs / playwright filters
// can identify it as a manual artifact, not a regression test.

test(
  "PHASE-7 SCREENSHOT — OOS PDP /ru/products/par-500-20",
  { tag: "@requires-backend" },
  async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1024 })
    await page.goto("/ru/products/par-500-20")
    await page.waitForLoadState("networkidle")
    await page.screenshot({
      path: "test-results/phase-7-oos-pdp.png",
      fullPage: true,
    })
  },
)
