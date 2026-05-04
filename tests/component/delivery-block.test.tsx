import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { DeliveryBlock } from "@/components/order/DeliveryBlock"
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

const baseOrder: OrderRead = {
  id: "019df06a-0000-0000-0000-000000000001",
  order_number: "PH-2026-12345",
  branch_id: 1,
  status: "confirmed",
  payment_status: "pending",
  payment_method: "cash_on_delivery",
  delivery_method: "delivery",
  recipient_name: "Иван Петров",
  recipient_phone: "+996700123456",
  delivery_address: {
    address_line: "мкр Асанбай, дом 12",
    apartment: "45",
    entrance: "3",
    floor: "5",
    city: "Бишкек",
    landmark: "напротив школы №42",
    delivery_notes: "Позвонить за 5 минут",
  },
  subtotal: "1000.00",
  delivery_fee: "150.00",
  discount_amount: "0",
  total: "1150.00",
  currency: "KGS",
  customer_notes: "Без сахара пожалуйста",
  cancel_reason: null,
  placed_at: "2026-05-04T09:30:00Z",
  confirmed_at: null,
  delivered_at: null,
  cancelled_at: null,
  items: [],
  history: [],
}

describe("DeliveryBlock", () => {
  it("renders recipient name + formatted phone", () => {
    render(withIntl(<DeliveryBlock order={baseOrder} />))
    expect(screen.getByText("Иван Петров")).toBeInTheDocument()
    // E.164 format display via libphonenumber-js — looks like "+996 700 12 34 56"
    expect(screen.getByText(/\+996\s*700/)).toBeInTheDocument()
  })

  it("renders delivery address parts joined for delivery orders", () => {
    render(withIntl(<DeliveryBlock order={baseOrder} />))
    expect(screen.getByText(/мкр Асанбай, дом 12/)).toBeInTheDocument()
    expect(screen.getByText("напротив школы №42")).toBeInTheDocument()
    expect(screen.getByText("Позвонить за 5 минут")).toBeInTheDocument()
  })

  it("hides delivery address for pickup orders", () => {
    render(
      withIntl(
        <DeliveryBlock
          order={{ ...baseOrder, delivery_method: "pickup", delivery_address: null }}
        />,
      ),
    )
    expect(screen.queryByText("Адрес доставки")).not.toBeInTheDocument()
  })

  it("renders customer notes when present", () => {
    render(withIntl(<DeliveryBlock order={baseOrder} />))
    expect(screen.getByText("Без сахара пожалуйста")).toBeInTheDocument()
  })

  it("renders cancel reason when present", () => {
    render(
      withIntl(<DeliveryBlock order={{ ...baseOrder, cancel_reason: "customer_changed_mind" }} />),
    )
    expect(screen.getByText("customer_changed_mind")).toBeInTheDocument()
  })

  it("does not render cancel reason / notes blocks when fields are null", () => {
    render(
      withIntl(
        <DeliveryBlock order={{ ...baseOrder, customer_notes: null, cancel_reason: null }} />,
      ),
    )
    expect(screen.queryByText("Комментарий к заказу")).not.toBeInTheDocument()
    expect(screen.queryByText("Причина отмены")).not.toBeInTheDocument()
  })
})
