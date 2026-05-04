import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import { ConflictBanner } from "@/components/checkout/ConflictBanner"
import { unflattenMessages } from "@/i18n/unflatten"
import type { PriceConflict, StockConflict } from "@/lib/api/types"
import ru from "@/messages/ru.json"

function withProvider(node: React.ReactNode) {
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

const stock: StockConflict = {
  cart_item_id: 1,
  product_id: "019df06a-0000-0000-0000-000000000001",
  requested_quantity: 5,
  available_quantity: 2,
}

const price: PriceConflict = {
  cart_item_id: 2,
  product_id: "019df06a-0000-0000-0000-000000000002",
  snapshot_price: "100.00",
  current_price: "150.00",
}

const names = new Map<number, string>([
  [1, "Парацетамол 500 мг"],
  [2, "Ибупрофен 200 мг"],
])

describe("ConflictBanner", () => {
  it("renders nothing when both arrays are empty", () => {
    const { container } = render(
      withProvider(
        <ConflictBanner
          stockConflicts={[]}
          priceConflicts={[]}
          cartItemNames={names}
          locale="ru"
          onEditCart={() => {}}
        />,
      ),
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders stock + price conflict lines + always-actionable Edit-cart CTA", () => {
    const onEditCart = vi.fn()
    render(
      withProvider(
        <ConflictBanner
          stockConflicts={[stock]}
          priceConflicts={[price]}
          cartItemNames={names}
          locale="ru"
          onEditCart={onEditCart}
        />,
      ),
    )
    const alert = screen.getByRole("alert")
    expect(alert).toHaveAttribute("data-slot", "checkout-conflict-banner")
    expect(alert).toHaveTextContent(/Парацетамол 500 мг/)
    expect(alert).toHaveTextContent(/Ибупрофен 200 мг/)
    // Stock conflict surface — i18n message embeds requested + available.
    expect(alert).toHaveTextContent(/2/)
    expect(alert).toHaveTextContent(/5/)
    // Edit-cart CTA always present.
    const cta = screen.getByRole("button", { name: /Перейти в корзину/ })
    expect(cta).toBeInTheDocument()
  })
})
