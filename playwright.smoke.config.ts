import { defineConfig, devices } from "@playwright/test"

// Smoke-test config. Phase 12C.
//
// Runs against a deployed environment (staging or production), NOT a dev
// server. `E2E_BASE_URL` is REQUIRED — the config has no `webServer`
// fallback. CI wires this for post-deploy verification; humans run it
// against staging.nookat.kg before promoting to production.
//
// Scope: read-only smokes. NO mutations (no OTP login, no place-order)
// because the suite would otherwise litter the staging DB or — worse —
// run against production accidentally. The trade-off is documented in
// `LAUNCH_CHECKLIST.md > Smoke tests`.
//
// Default invocation:
//   E2E_BASE_URL=https://staging.nookat.kg pnpm smoke
//
// Locale-prefix asserts target /ru by default; override via E2E_SMOKE_LOCALE.

const BASE_URL = process.env.E2E_BASE_URL
if (!BASE_URL) {
  throw new Error(
    "playwright.smoke.config.ts requires E2E_BASE_URL — point it at the deployed environment.",
  )
}

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: "./tests/smoke",
  testMatch: /.*\.smoke\.ts$/,
  // Smoke runs over the network — give a bit more headroom than dev e2e.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  // Single browser is sufficient — smoke is structural, not visual; cross-
  // browser regression is e2e's job.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(isCI ? { workers: 1 } : {}),
})
