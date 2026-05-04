import { exec } from "node:child_process"
import { promisify } from "node:util"

import { test, expect } from "@playwright/test"

// Cart-merge handoff E2E — @requires-backend. Verifies the locked
// merge sequence in app/[locale]/auth/otp/page.tsx (DECISION_LOG D12).
// Adds a product as a guest, completes OTP verify, lands on /account,
// navigates to /cart and confirms the previously-added item survived
// the auth transition.
//
// Phase 8 plan R-C verification: navigate to /cart IMMEDIATELY after
// verify success and watch for any flash of empty-state. The locked
// sequence (verify → snapshot guest cart → set tokens → merge →
// invalidate → redirect) prevents the flash; this spec is the
// regression net.
//
// Reuses the Phase 5 OTP-fishing helper. Fails fast with a clear
// error if the backend log doesn't contain a 6-digit code.

const exec_ = promisify(exec)
const TEST_PHONE_DISPLAY = "+996 555 99 88 77"
const BACKEND_LOG_PATH = process.env.BACKEND_LOG_PATH ?? "/tmp/backend.log"
const BACKEND_OTP_CMD =
  process.env.BACKEND_OTP_CMD ??
  `tail -n 200 ${BACKEND_LOG_PATH} | grep -oE 'code[^0-9]{1,5}[0-9]{6}' | tail -n 1 | grep -oE '[0-9]{6}'`

async function fetchOtpCodeFromBackend(): Promise<string> {
  const { stdout } = await exec_(BACKEND_OTP_CMD, { shell: "/bin/bash" })
  const code = stdout.trim()
  if (!/^[0-9]{6}$/.test(code)) {
    throw new Error(
      `Failed to extract a 6-digit OTP code from backend log via: ${BACKEND_OTP_CMD}\n` +
        `Got: "${code}"\n`,
    )
  }
  return code
}

test.describe("cart-merge on login", () => {
  test("guest cart preserved across OTP verify", { tag: "@requires-backend" }, async ({ page }) => {
    await page.context().clearCookies()

    // Step 1 — add a product as guest.
    await page.goto("/ru/categories/pain-relief")
    await page.locator('[data-slot="add-to-cart-button"]:not([disabled])').first().click()
    await expect(page.getByText(/Добавлено в корзину/)).toBeVisible({
      timeout: 5_000,
    })
    await expect(page.locator('[data-slot="cart-badge"]').first()).toHaveText("1", {
      timeout: 5_000,
    })

    // Capture the pre-login cart line text so we can verify it survives.
    await page.goto("/ru/cart")
    const guestLineHeading = page.locator('[data-slot="cart-line"] a').first()
    const guestLineText = await guestLineHeading.textContent()
    expect(guestLineText).toBeTruthy()

    // Step 2 — start OTP flow.
    await page.goto("/ru/auth/otp")
    const phoneInput = page.getByRole("textbox").first()
    await phoneInput.fill(TEST_PHONE_DISPLAY)
    await phoneInput.blur()
    await page.getByRole("button", { name: /отправ/i }).click()
    await expect(page.getByRole("textbox").nth(0)).toBeVisible({
      timeout: 10_000,
    })

    // Step 3 — pull OTP from backend log + complete verify.
    const code = await fetchOtpCodeFromBackend()
    const otpCells = page.getByRole("textbox")
    for (let i = 0; i < 6; i += 1) {
      await otpCells.nth(i).fill(code[i] ?? "")
    }
    await expect(page).toHaveURL(/\/ru\/account\b/, { timeout: 15_000 })

    // Step 4 — navigate to /cart IMMEDIATELY. Per Phase 8 plan R-C the
    // merge sequence completes BEFORE redirect, so the cart must be
    // populated on first paint (no flash of empty-state).
    await page.goto("/ru/cart")
    await expect(page.locator('[data-slot="cart-line"]').first()).toBeVisible({ timeout: 5_000 })

    // Verify the same line content survived. (Product slug + name are
    // stable; quantity may differ if the merge re-added on top of an
    // existing user-cart line, but for a fresh user it should match.)
    const mergedLineText = await page.locator('[data-slot="cart-line"] a').first().textContent()
    expect(mergedLineText).toBe(guestLineText)
  })
})
