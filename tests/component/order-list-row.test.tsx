import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { OrderListRow } from "@/components/order/OrderListRow"
import { unflattenMessages } from "@/i18n/unflatten"
import type { OrderListItem } from "@/lib/api/types"
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

const baseOrder: OrderListItem = {
  id: "019df06a-0000-0000-0000-000000000001",
  order_number: "PH-2026-12345",
  status: "confirmed",
  payment_status: "pending",
  total: "1250.00",
  currency: "KGS",
  placed_at: "2026-05-04T09:30:00Z",
  item_count: 3,
}

describe("OrderListRow", () => {
  it("links to the order detail page using the locale + order_number", () => {
    render(withIntl(<OrderListRow order={baseOrder} locale="ru" />))
    const link = screen.getByRole("link", { name: /PH-2026-12345/ })
    expect(link).toHaveAttribute("href", "/ru/orders/PH-2026-12345")
  })

  it("renders order number with monospace + PH- prefix (sacred-invariant #5)", () => {
    const { container } = render(withIntl(<OrderListRow order={baseOrder} locale="ru" />))
    const numberSlot = container.querySelector('[data-slot="order-number"]')
    expect(numberSlot).not.toBeNull()
    expect(numberSlot?.textContent).toBe("PH-2026-12345")
    expect(numberSlot?.className).toContain("font-mono")
  })

  it("renders the localized total formatted for ru locale", () => {
    render(withIntl(<OrderListRow order={baseOrder} locale="ru" />))
    // formatPrice for ru uses thin-space U+2009 thousands + lowercase сом suffix.
    // Match flexibly because the thin-space character is non-ASCII.
    expect(screen.getByText(/1\s*250\s*сом/u)).toBeInTheDocument()
  })

  it("exposes data-status for testability", () => {
    const { container } = render(
      withIntl(<OrderListRow order={{ ...baseOrder, status: "out_for_delivery" }} locale="ru" />),
    )
    const row = container.querySelector('[data-slot="order-list-row"]')
    expect(row).toHaveAttribute("data-status", "out_for_delivery")
  })

  it("renders status pip with the right tone (delivered → success)", () => {
    const { container } = render(
      withIntl(<OrderListRow order={{ ...baseOrder, status: "delivered" }} locale="ru" />),
    )
    const pip = container.querySelector('[data-slot="status-pip"][data-status="delivered"]')
    expect(pip).not.toBeNull()
    expect(pip?.className).toContain("text-success-700")
  })
})
