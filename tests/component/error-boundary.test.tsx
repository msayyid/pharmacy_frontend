import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import LocaleErrorBoundary from "@/app/[locale]/error"
import { unflattenMessages } from "@/i18n/unflatten"
import ru from "@/messages/ru.json"

// Phase 11C. The locale-level error boundary surfaces a Retry CTA + the
// support phone (sacred-invariant #4: customer support phone always one
// tap away). PII discipline: error.message must not appear in rendered
// copy — only the digest is acceptable.

vi.mock("@/lib/observability/trace", () => ({
  trace: vi.fn(),
}))

function withIntl(node: React.ReactNode) {
  return (
    <NextIntlClientProvider
      locale="ru"
      messages={unflattenMessages(ru as Record<string, string>)}
      timeZone="Asia/Bishkek"
    >
      {node}
    </NextIntlClientProvider>
  )
}

describe("LocaleErrorBoundary", () => {
  it("renders the generic error title + retry CTA + support phone", () => {
    const reset = vi.fn()
    const error = new Error("DB unreachable") as Error & { digest?: string }
    error.digest = "abc123"

    render(withIntl(<LocaleErrorBoundary error={error} reset={reset} />))

    expect(screen.getByText(/Что-то пошло не так/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Повторить/ })).toBeInTheDocument()
    // Support phone surface — read from BRAND.supportPhone, not i18n.
    expect(screen.getAllByRole("link", { name: /\+996/ }).length).toBeGreaterThanOrEqual(1)
  })

  it("does not render the raw error.message (PII discipline)", () => {
    const reset = vi.fn()
    const error = new Error("verbose internal stack with PII +996 700 11 22 33") as Error & {
      digest?: string
    }
    error.digest = "abc123"

    render(withIntl(<LocaleErrorBoundary error={error} reset={reset} />))
    expect(screen.queryByText(/verbose internal stack/)).not.toBeInTheDocument()
  })

  it("renders error.digest as the [code] block in the ErrorState", () => {
    const reset = vi.fn()
    const error = new Error("boom") as Error & { digest?: string }
    error.digest = "ph-digest-9988"
    render(withIntl(<LocaleErrorBoundary error={error} reset={reset} />))
    expect(screen.getByText(/ph-digest-9988/)).toBeInTheDocument()
  })

  it("invokes reset() when the retry button is clicked", async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    const error = new Error("boom") as Error & { digest?: string }
    render(withIntl(<LocaleErrorBoundary error={error} reset={reset} />))

    await user.click(screen.getByRole("button", { name: /Повторить/ }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
