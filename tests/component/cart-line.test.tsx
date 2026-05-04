import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { CartLine } from "@/components/cart/CartLine"
import { unflattenMessages } from "@/i18n/unflatten"
import type { CartItemRead } from "@/lib/api/types"
import ru from "@/messages/ru.json"

// CartLine variants: in-stock / out-of-stock / price-changed / null
// fields. Mutation hooks (useUpdateCartItem, useRemoveCartItem) need a
// QueryClientProvider — we wrap with a fresh one per test so the tests
// don't share cache.

function withProviders(node: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider
        locale="ru"
        messages={unflattenMessages(ru as Record<string, string>)}
        timeZone="Asia/Bishkek"
      >
        {node}
      </NextIntlClientProvider>
    </QueryClientProvider>
  )
}

const baseItem: CartItemRead = {
  id: 1,
  product_id: "019df06a-0000-0000-0000-000000000001",
  product_name: "Парацетамол 500 мг",
  product_slug: "par-500-20",
  thumbnail_url: null,
  quantity: 2,
  price_snapshot: "120.00",
  current_price: "120.00",
  available_quantity: 50,
  is_in_stock: true,
  line_total: "240.00",
  added_at: "2026-05-04T12:00:00Z",
  updated_at: "2026-05-04T12:00:00Z",
}

describe("CartLine", () => {
  it("in-stock variant: no banners; product name links to PDP", () => {
    render(withProviders(<CartLine item={baseItem} locale="ru" />))
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
    const link = screen.getByRole("link", { name: /Парацетамол 500 мг/ })
    expect(link).toHaveAttribute("href", "/ru/products/par-500-20")
  })

  it("out-of-stock variant: red banner with Удалить action", () => {
    render(withProviders(<CartLine item={{ ...baseItem, is_in_stock: false }} locale="ru" />))
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent(/Нет в наличии/)
    expect(alert).toHaveTextContent(/Удалить/)
    expect(screen.getByRole("article")).toHaveAttribute("data-stock", "out-of-stock")
  })

  it("price-changed variant: yellow strip with Обновить цену action", () => {
    render(withProviders(<CartLine item={{ ...baseItem, current_price: "150.00" }} locale="ru" />))
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent(/Цена изменилась/)
    expect(status).toHaveTextContent(/Обновить цену/)
    expect(screen.getByRole("article")).toHaveAttribute("data-price-changed", "true")
  })

  it("null product_name falls back to t('product.unavailable')", () => {
    render(withProviders(<CartLine item={{ ...baseItem, product_name: null }} locale="ru" />))
    expect(screen.getByText(/Товар временно недоступен/)).toBeInTheDocument()
  })

  it("null is_in_stock is treated as in-stock (no false-flag banner)", () => {
    render(withProviders(<CartLine item={{ ...baseItem, is_in_stock: null }} locale="ru" />))
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByRole("article")).toHaveAttribute("data-stock", "in-stock")
  })

  it("null current_price hides the price-changed banner", () => {
    render(withProviders(<CartLine item={{ ...baseItem, current_price: null }} locale="ru" />))
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("null product_slug renders name as text without link", () => {
    render(withProviders(<CartLine item={{ ...baseItem, product_slug: null }} locale="ru" />))
    expect(screen.queryByRole("link", { name: /Парацетамол/ })).toBeNull()
    expect(screen.getByText(/Парацетамол 500 мг/)).toBeInTheDocument()
  })
})
