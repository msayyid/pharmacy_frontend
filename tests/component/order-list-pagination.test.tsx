import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import { OrderListPagination } from "@/components/order/OrderListPagination"
import { unflattenMessages } from "@/i18n/unflatten"
import ru from "@/messages/ru.json"

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

describe("OrderListPagination", () => {
  it("returns null when totalPages <= 1", () => {
    const { container } = render(
      withIntl(<OrderListPagination currentPage={1} totalPages={1} onChange={() => {}} />),
    )
    expect(container.firstChild).toBeNull()
  })

  it("disables prev on first page and enables next", () => {
    render(withIntl(<OrderListPagination currentPage={1} totalPages={5} onChange={() => {}} />))
    expect(screen.getByLabelText("Предыдущая")).toBeDisabled()
    expect(screen.getByLabelText("Следующая")).not.toBeDisabled()
  })

  it("disables next on last page", () => {
    render(withIntl(<OrderListPagination currentPage={5} totalPages={5} onChange={() => {}} />))
    expect(screen.getByLabelText("Следующая")).toBeDisabled()
  })

  it("calls onChange with the clicked page number", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(withIntl(<OrderListPagination currentPage={1} totalPages={5} onChange={onChange} />))
    await user.click(screen.getByRole("button", { name: "3" }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it("marks the current page with aria-current", () => {
    const { container } = render(
      withIntl(<OrderListPagination currentPage={3} totalPages={10} onChange={() => {}} />),
    )
    const current = container.querySelector('[aria-current="page"]')
    expect(current).not.toBeNull()
    expect(current?.textContent).toBe("3")
  })

  it("renders an ellipsis when there's a gap", () => {
    // currentPage 5 of 20 → window: 1, 3, 4, 5, 6, 7, 20 with gaps
    const { container } = render(
      withIntl(<OrderListPagination currentPage={5} totalPages={20} onChange={() => {}} />),
    )
    const gaps = container.querySelectorAll('[aria-hidden="true"].text-ink-400')
    // Expect at least one ellipsis element.
    const ellipsisCount = Array.from(gaps).filter((el) => el.textContent === "…").length
    expect(ellipsisCount).toBeGreaterThanOrEqual(1)
  })
})
