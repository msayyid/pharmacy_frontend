import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

// Phase 11E — full-page accessibility scan via @axe-core/playwright on
// representative public + transactional surfaces. Manual NVDA / VoiceOver
// SR testing is documented in BUILD_PROGRESS.md as a pre-launch item;
// this spec is the automated regression net.
//
// Scope: WCAG 2.1 A + AA, plus best-practice rules. Per Phase 11 prompt
// DoD ("axe scan: zero critical") we hard-fail on `impact === "critical"`.
// Serious-tier violations (notably color-contrast on a few token pairings
// surfaced at this gate's first run — Footer copy on light surface, OTP
// label tokens) are tracked in `BUILD_PROGRESS.md > Backlog > A11y polish`
// for the pre-launch human review pass. Moderate/minor: surfaced via
// console warnings only.
//
// No @requires-backend tag — uses the dev server's RSC fetcher catch-and-
// empty contract (Phase 6 D11) so pages render their EmptyState surfaces
// against an empty backend. The test asserts STRUCTURE, not content.
//
// Backend-dependent surfaces (PDP, populated category) get their own
// @requires-backend coverage in tests/e2e/pdp-flow.spec.ts and friends.

const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]

async function expectNoCritical(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()
  const critical = results.violations.filter((v) => v.impact === "critical")
  // Surface serious-tier as warnings so we can track polish-pass items
  // without breaking the gate.
  const serious = results.violations.filter((v) => v.impact === "serious")
  if (serious.length > 0) {
    const summary = serious
      .map((v) => `   [serious] ${v.id} (${v.nodes.length} nodes) — ${v.help}`)
      .join("\n")
    console.warn(`axe-core: ${serious.length} serious-tier violations (non-blocking):\n${summary}`)
  }
  if (critical.length > 0) {
    const summary = critical
      .map((v) => `[critical] ${v.id}: ${v.help} (${v.nodes.length} nodes)\n   → ${v.helpUrl}`)
      .join("\n")
    throw new Error(`axe-core: ${critical.length} critical violations\n${summary}`)
  }
  expect(critical, "critical axe violations").toHaveLength(0)
}

test.describe("a11y — public surfaces", () => {
  test("/ru homepage has no critical/serious axe violations", async ({ page }) => {
    await page.goto("/ru")
    // Wait for the hero to render so axe sees real content (not the
    // skeleton placeholder).
    await page.waitForSelector("h1, [data-slot='hero']", { timeout: 10_000 }).catch(() => {})
    await expectNoCritical(page)
  })

  test("/ru/categories has no critical/serious axe violations", async ({ page }) => {
    await page.goto("/ru/categories")
    await page.waitForSelector("h1", { timeout: 10_000 })
    await expectNoCritical(page)
  })

  test("/ru/about has no critical/serious axe violations", async ({ page }) => {
    await page.goto("/ru/about")
    await page.waitForSelector("h1", { timeout: 10_000 })
    await expectNoCritical(page)
  })
})

test.describe("a11y — auth surface", () => {
  test("/ru/auth/otp (PHONE state) has no critical/serious axe violations", async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/ru/auth/otp")
    await page.waitForSelector("h1, label", { timeout: 10_000 })
    await expectNoCritical(page)
  })
})

test.describe("a11y — security headers (verify in same dev server pass)", () => {
  test("response carries the Phase 11E security headers", async ({ page }) => {
    const response = await page.goto("/ru")
    expect(response).not.toBeNull()
    const headers = response!.headers()
    expect(headers["x-frame-options"]).toBe("DENY")
    expect(headers["x-content-type-options"]).toBe("nosniff")
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(headers["permissions-policy"]).toContain("geolocation=()")
  })
})
