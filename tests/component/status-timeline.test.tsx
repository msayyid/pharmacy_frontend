import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { StatusTimeline } from "@/components/order/StatusTimeline"
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
  status: "pending",
  payment_status: "pending",
  payment_method: "cash_on_delivery",
  delivery_method: "delivery",
  recipient_name: "Иван Иванов",
  recipient_phone: "+996700123456",
  delivery_address: null,
  subtotal: "1000.00",
  delivery_fee: "150.00",
  discount_amount: "0",
  total: "1150.00",
  currency: "KGS",
  customer_notes: null,
  cancel_reason: null,
  placed_at: "2026-05-04T09:30:00Z",
  confirmed_at: null,
  delivered_at: null,
  cancelled_at: null,
  items: [],
  history: [
    {
      from_status: null,
      to_status: "pending",
      changed_by_system: true,
      notes: null,
      created_at: "2026-05-04T09:30:00Z",
    },
  ],
}

function getStep(container: HTMLElement, status: string) {
  return container.querySelector(`[data-step-status="${status}"]`)
}

describe("StatusTimeline — delivery sequence", () => {
  it("pending: only first step active, rest upcoming", () => {
    const { container } = render(withIntl(<StatusTimeline order={baseOrder} locale="ru" />))
    expect(getStep(container, "pending")).toHaveAttribute("data-step-state", "active")
    expect(getStep(container, "confirmed")).toHaveAttribute("data-step-state", "upcoming")
    expect(getStep(container, "out_for_delivery")).toHaveAttribute("data-step-state", "upcoming")
    expect(getStep(container, "delivered")).toHaveAttribute("data-step-state", "upcoming")
  })

  it("preparing: pending+confirmed done, preparing active, rest upcoming", () => {
    const { container } = render(
      withIntl(
        <StatusTimeline
          order={{
            ...baseOrder,
            status: "preparing",
            confirmed_at: "2026-05-04T10:00:00Z",
            history: [
              ...baseOrder.history,
              {
                from_status: "pending",
                to_status: "confirmed",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-04T10:00:00Z",
              },
              {
                from_status: "confirmed",
                to_status: "preparing",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-04T10:30:00Z",
              },
            ],
          }}
          locale="ru"
        />,
      ),
    )
    expect(getStep(container, "pending")).toHaveAttribute("data-step-state", "done")
    expect(getStep(container, "confirmed")).toHaveAttribute("data-step-state", "done")
    expect(getStep(container, "preparing")).toHaveAttribute("data-step-state", "active")
    expect(getStep(container, "out_for_delivery")).toHaveAttribute("data-step-state", "upcoming")
    expect(getStep(container, "delivered")).toHaveAttribute("data-step-state", "upcoming")
  })

  it("delivered: every step done", () => {
    const { container } = render(
      withIntl(
        <StatusTimeline
          order={{
            ...baseOrder,
            status: "delivered",
            confirmed_at: "2026-05-04T10:00:00Z",
            delivered_at: "2026-05-04T13:00:00Z",
            history: [
              { ...baseOrder.history[0]! },
              {
                from_status: "pending",
                to_status: "confirmed",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-04T10:00:00Z",
              },
              {
                from_status: "confirmed",
                to_status: "preparing",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-04T10:30:00Z",
              },
              {
                from_status: "preparing",
                to_status: "out_for_delivery",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-04T11:00:00Z",
              },
              {
                from_status: "out_for_delivery",
                to_status: "delivered",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-04T13:00:00Z",
              },
            ],
          }}
          locale="ru"
        />,
      ),
    )
    expect(getStep(container, "pending")).toHaveAttribute("data-step-state", "done")
    expect(getStep(container, "confirmed")).toHaveAttribute("data-step-state", "done")
    expect(getStep(container, "preparing")).toHaveAttribute("data-step-state", "done")
    expect(getStep(container, "out_for_delivery")).toHaveAttribute("data-step-state", "done")
    expect(getStep(container, "delivered")).toHaveAttribute("data-step-state", "active")
    expect(screen.getByText(/Заказ доставлен. Спасибо за покупку!/)).toBeInTheDocument()
  })
})

describe("StatusTimeline — pickup sequence", () => {
  it("uses ready_for_pickup instead of out_for_delivery", () => {
    const { container } = render(
      withIntl(
        <StatusTimeline
          order={{ ...baseOrder, delivery_method: "pickup", status: "preparing" }}
          locale="ru"
        />,
      ),
    )
    expect(getStep(container, "ready_for_pickup")).not.toBeNull()
    expect(getStep(container, "out_for_delivery")).toBeNull()
  })
})

describe("StatusTimeline — terminal interrupts", () => {
  it("cancelled: spine collapses; terminal row with cancel copy", () => {
    const { container } = render(
      withIntl(
        <StatusTimeline
          order={{
            ...baseOrder,
            status: "cancelled",
            cancelled_at: "2026-05-04T10:15:00Z",
            cancel_reason: "customer_changed_mind",
            history: [
              { ...baseOrder.history[0]! },
              {
                from_status: "pending",
                to_status: "cancelled",
                changed_by_system: false,
                notes: "customer_changed_mind",
                created_at: "2026-05-04T10:15:00Z",
              },
            ],
          }}
          locale="ru"
        />,
      ),
    )
    // Done row stays.
    expect(getStep(container, "pending")).toHaveAttribute("data-step-state", "done")
    // Upcoming rows are hidden under interrupt.
    expect(getStep(container, "confirmed")).toBeNull()
    expect(getStep(container, "out_for_delivery")).toBeNull()
    // Terminal row appears with the cancel copy.
    expect(
      screen.getByText(/Заказ отменён. Если у вас есть вопросы — позвоните нам./),
    ).toBeInTheDocument()
  })

  it("refunded: terminal row with refund copy", () => {
    const { container } = render(
      withIntl(
        <StatusTimeline
          order={{
            ...baseOrder,
            status: "refunded",
            history: [
              { ...baseOrder.history[0]! },
              {
                from_status: "pending",
                to_status: "confirmed",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-04T10:00:00Z",
              },
              {
                from_status: "confirmed",
                to_status: "preparing",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-04T10:30:00Z",
              },
              {
                from_status: "preparing",
                to_status: "out_for_delivery",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-04T11:00:00Z",
              },
              {
                from_status: "out_for_delivery",
                to_status: "delivered",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-04T13:00:00Z",
              },
              {
                from_status: "delivered",
                to_status: "refunded",
                changed_by_system: false,
                notes: null,
                created_at: "2026-05-05T09:00:00Z",
              },
            ],
          }}
          locale="ru"
        />,
      ),
    )
    // delivered is the last "done" row — refunded row is the terminal
    expect(getStep(container, "delivered")).toHaveAttribute("data-step-state", "done")
    expect(screen.getByText(/Заказ возвращён. Средства будут возвращены/)).toBeInTheDocument()
  })
})
