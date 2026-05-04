import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import { OrderItemsBlock } from "@/components/order/OrderItemsBlock"
import { unflattenMessages } from "@/i18n/unflatten"
import type { OrderRead } from "@/lib/api/types"
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

const order: OrderRead = {
  id: "019df06a-0000-0000-0000-000000000001",
  order_number: "PH-2026-12345",
  branch_id: 1,
  status: "delivered",
  payment_status: "paid",
  payment_method: "cash_on_delivery",
  delivery_method: "delivery",
  recipient_name: "Иван Иванов",
  recipient_phone: "+996700123456",
  delivery_address: null,
  subtotal: "1240.00",
  delivery_fee: "150.00",
  discount_amount: "0",
  total: "1390.00",
  currency: "KGS",
  customer_notes: null,
  cancel_reason: null,
  placed_at: "2026-05-04T09:30:00Z",
  confirmed_at: null,
  delivered_at: null,
  cancelled_at: null,
  items: [
    {
      id: 1,
      product_id: "019df06a-0000-0000-0000-000000000001",
      inventory_batch_id: 42,
      product_name_snapshot: "Парацетамол 500мг 12 таб",
      product_sku_snapshot: "PAR-500-12",
      batch_number_snapshot: "B202604",
      expiry_date_snapshot: "2027-12-31",
      quantity: 2,
      unit_price: "120.00",
      line_total: "240.00",
    },
    {
      id: 2,
      product_id: "019df06a-0000-0000-0000-000000000002",
      inventory_batch_id: 43,
      product_name_snapshot: "Ибупрофен 200мг 20 таб",
      product_sku_snapshot: "IBU-200-20",
      batch_number_snapshot: "B202605",
      expiry_date_snapshot: "2027-06-30",
      quantity: 1,
      unit_price: "1000.00",
      line_total: "1000.00",
    },
  ],
  history: [],
}

describe("OrderItemsBlock", () => {
  it("renders snapshot fields verbatim — sacred-invariant snapshot immutability", () => {
    render(withIntl(<OrderItemsBlock order={order} locale="ru" />))
    expect(screen.getByText("Парацетамол 500мг 12 таб")).toBeInTheDocument()
    expect(screen.getByText("Ибупрофен 200мг 20 таб")).toBeInTheDocument()
  })

  it("renders quantity × unit_price per item", () => {
    render(withIntl(<OrderItemsBlock order={order} locale="ru" />))
    expect(screen.getByText(/2\s*×\s*120\s*сом/u)).toBeInTheDocument()
    expect(screen.getByText(/1\s*×\s*1\s*000\s*сом/u)).toBeInTheDocument()
  })

  it("renders subtotal + delivery + total in totals block", () => {
    render(withIntl(<OrderItemsBlock order={order} locale="ru" />))
    expect(screen.getByText(/1\s*240\s*сом/u)).toBeInTheDocument()
    expect(screen.getByText(/150\s*сом/u)).toBeInTheDocument()
    expect(screen.getByText(/1\s*390\s*сом/u)).toBeInTheDocument()
  })

  it("hides discount row when discount_amount is 0", () => {
    render(withIntl(<OrderItemsBlock order={order} locale="ru" />))
    expect(screen.queryByText("Скидка")).not.toBeInTheDocument()
  })

  it("does NOT trigger any network call (snapshot path)", () => {
    // Per CLAUDE.md: snapshot fields are immutable; never refetch
    // product detail to override the order line. We assert by
    // monitoring fetch — zero calls.
    const fetchSpy = vi.fn()
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    try {
      render(withIntl(<OrderItemsBlock order={order} locale="ru" />))
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
