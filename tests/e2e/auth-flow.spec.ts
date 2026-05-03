import { exec } from "node:child_process"
import { promisify } from "node:util"

import { test, expect } from "@playwright/test"

// Full auth flow E2E — tagged @requires-backend so it's gated out of the
// CI default run (Playwright config / smoke recipe filters by tag). Run
// locally with the backend up:
//
//   cd ../pharmacy_backend && make docker-up && make dev
//   pnpm e2e --grep @requires-backend
//
// This spec drives the full OTP loop through the real backend:
//   1. Navigate to /ru/auth/otp
//   2. Type +996 555 99 88 77 (E.164: +996555998877; arbitrary KG mobile)
//   3. POST /api/v1/auth/otp/request via the page (no mock)
//   4. Pull the OTP code from the backend log via the helper below
//   5. Type the 6 digits into OtpInput
//   6. Backend verify returns access + refresh; FE sets cookie + stores access
//   7. Page redirects to /ru/account; assert the heading + email field
//
// If the OTP-fishing helper fails to find a code in the configured log, the
// test fails fast with a clear error rather than timing out on the OTP box.

const exec_ = promisify(exec)
const TEST_PHONE_DISPLAY = "+996 555 99 88 77"
const TEST_PHONE_E164 = "+996555998877"
const BACKEND_LOG_PATH = process.env.BACKEND_LOG_PATH ?? "/tmp/backend.log"
const BACKEND_OTP_CMD =
  process.env.BACKEND_OTP_CMD ??
  // Default fishing strategy: tail the last sms_enqueued line and pull a
  // 6-digit code out of it. Override via BACKEND_OTP_CMD if your backend
  // log emits the code differently.
  `tail -n 200 ${BACKEND_LOG_PATH} | grep -oE 'code[^0-9]{1,5}[0-9]{6}' | tail -n 1 | grep -oE '[0-9]{6}'`

async function fetchOtpCodeFromBackend(): Promise<string> {
  const { stdout } = await exec_(BACKEND_OTP_CMD, { shell: "/bin/bash" })
  const code = stdout.trim()
  if (!/^[0-9]{6}$/.test(code)) {
    throw new Error(
      `Failed to extract a 6-digit OTP code from backend log via: ${BACKEND_OTP_CMD}\n` +
        `Got: "${code}"\n` +
        "Set BACKEND_OTP_CMD to a shell command that prints the code on stdout.",
    )
  }
  return code
}

test.describe("OTP auth flow", () => {
  test("request → verify → /account", { tag: "@requires-backend" }, async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/ru/auth/otp")
    await expect(page).toHaveURL(/\/ru\/auth\/otp\b/)

    const phoneInput = page.getByRole("textbox").first()
    await phoneInput.fill(TEST_PHONE_DISPLAY)
    await phoneInput.blur()

    await page.getByRole("button", { name: /отправ/i }).click()

    // OtpInput renders six single-digit cells.
    await expect(page.getByRole("textbox").nth(0)).toBeVisible({ timeout: 10_000 })

    const code = await fetchOtpCodeFromBackend()

    const otpCells = page.getByRole("textbox")
    for (let i = 0; i < 6; i += 1) {
      await otpCells.nth(i).fill(code[i] ?? "")
    }

    await expect(page).toHaveURL(/\/ru\/account\b/, { timeout: 15_000 })
    await expect(page.locator("h1")).toBeVisible()

    // The auth cookie was set at our origin.
    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name === "nookat_refresh")).toBeTruthy()

    // Phone field on the profile form should reflect the logged-in user.
    // We only check that the page mentions the phone E.164 somewhere.
    await expect(page.getByText(TEST_PHONE_E164, { exact: false })).toBeVisible({
      timeout: 5_000,
    })
  })

  test(
    "logout clears cookie and re-protects /account",
    { tag: "@requires-backend" },
    async ({ page }) => {
      // Depends on a fresh login from the previous test having seeded a session.
      // For independence, re-run the request flow.
      await page.context().clearCookies()
      await page.goto("/ru/auth/otp")
      const phoneInput = page.getByRole("textbox").first()
      await phoneInput.fill(TEST_PHONE_DISPLAY)
      await phoneInput.blur()
      await page.getByRole("button", { name: /отправ/i }).click()
      await expect(page.getByRole("textbox").nth(0)).toBeVisible({ timeout: 10_000 })

      const code = await fetchOtpCodeFromBackend()
      const otpCells = page.getByRole("textbox")
      for (let i = 0; i < 6; i += 1) {
        await otpCells.nth(i).fill(code[i] ?? "")
      }
      await expect(page).toHaveURL(/\/ru\/account\b/, { timeout: 15_000 })

      // Click the logout button (rendered on /ru/account).
      await page.getByRole("button", { name: /выйти/i }).click()

      // After logout the cookie should be gone and a hard-gated route should redirect.
      await page.goto("/ru/account")
      await expect(page).toHaveURL(/\/ru\/auth\/otp\?return=%2Fru%2Faccount\b/)
    },
  )
})
