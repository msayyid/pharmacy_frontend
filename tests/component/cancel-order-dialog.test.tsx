import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CancelOrderButton } from "@/components/order/CancelOrderDialog"
import { unflattenMessages } from "@/i18n/unflatten"
import { ApiError } from "@/lib/api/errors"
import type { OrderRead } from "@/lib/api/types"
import ru from "@/messages/ru.json"

// Mock the apiClient so the mutation can resolve / reject without
// hitting a real backend. Component test scope: dialog UX (open,
// confirm, error path), not the network layer.
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    POST: vi.fn(),
  },
}))

// Sonner reads window.matchMedia which jsdom doesn't provide. We
// don't render the <Toaster /> here; instead we capture toast.success
// / toast.error calls directly via a vi.mock spy. This keeps the test
// surface focused on dialog UX.
const toastSpies = {
  success: vi.fn(),
  error: vi.fn(),
}
vi.mock("sonner", () => ({
  toast: {
    success: (msg: string, opts?: unknown) => toastSpies.success(msg, opts),
    error: (msg: string, opts?: unknown) => toastSpies.error(msg, opts),
  },
}))

import { apiClient } from "@/lib/api/client"

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
  history: [],
}

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

describe("CancelOrderDialog", () => {
  beforeEach(() => {
    vi.mocked(apiClient.POST).mockReset()
    toastSpies.success.mockReset()
    toastSpies.error.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("opens on CTA click", async () => {
    const user = userEvent.setup()
    render(withProviders(<CancelOrderButton order={baseOrder} />))
    await user.click(screen.getByRole("button", { name: "Отменить заказ" }))
    // Title text is rendered inside the AlertDialogTitle
    expect(await screen.findByText("Отменить заказ?")).toBeInTheDocument()
  })

  it("closes on Cancel action without firing the mutation", async () => {
    const user = userEvent.setup()
    render(withProviders(<CancelOrderButton order={baseOrder} />))
    await user.click(screen.getByRole("button", { name: "Отменить заказ" }))
    await user.click(screen.getByRole("button", { name: "Не отменять" }))
    await waitFor(() => {
      expect(screen.queryByText("Отменить заказ?")).not.toBeInTheDocument()
    })
    expect(apiClient.POST).not.toHaveBeenCalled()
  })

  it("Confirm fires POST /me/orders/{n}/cancel with the typed reason", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.POST).mockResolvedValueOnce({
      data: { ...baseOrder, status: "cancelled", cancel_reason: "передумал" },
    } as never)

    render(withProviders(<CancelOrderButton order={baseOrder} />))
    await user.click(screen.getByRole("button", { name: "Отменить заказ" }))
    const textarea = screen.getByLabelText(/Причина/)
    await user.type(textarea, "передумал")
    // Footer "Отменить заказ" button (the Confirm action)
    const confirmButtons = await screen.findAllByRole("button", { name: "Отменить заказ" })
    // The trigger and the confirm both have the same accessible name;
    // the confirm is inside the dialog footer (data-slot=alert-dialog-action).
    const confirm = confirmButtons.find(
      (b) => b.getAttribute("data-slot") === "alert-dialog-action",
    )
    expect(confirm).toBeDefined()
    await user.click(confirm!)

    await waitFor(() => {
      expect(apiClient.POST).toHaveBeenCalledWith(
        "/api/v1/me/orders/{order_number}/cancel",
        expect.objectContaining({
          params: { path: { order_number: "PH-2026-12345" } },
          body: { reason: "передумал" },
        }),
      )
    })
  })

  it("On API error keeps the dialog open and surfaces a toast", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.POST).mockRejectedValueOnce(
      new ApiError({
        code: "order_not_cancellable_by_customer",
        status: 409,
        context: {},
      }),
    )

    render(withProviders(<CancelOrderButton order={baseOrder} />))
    await user.click(screen.getByRole("button", { name: "Отменить заказ" }))
    const confirmButtons = await screen.findAllByRole("button", { name: "Отменить заказ" })
    const confirm = confirmButtons.find(
      (b) => b.getAttribute("data-slot") === "alert-dialog-action",
    )!
    await user.click(confirm)

    // Sonner toast captured via spy; localized copy resolved from i18n.
    await waitFor(() => {
      expect(toastSpies.error).toHaveBeenCalledWith(
        "Этот заказ нельзя отменить. Свяжитесь с нами, чтобы получить помощь.",
        undefined,
      )
    })
    // Dialog stays open.
    expect(screen.getByText("Отменить заказ?")).toBeInTheDocument()
  })

  it("On success calls toast.success with the localized confirmation", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.POST).mockResolvedValueOnce({
      data: { ...baseOrder, status: "cancelled" },
    } as never)

    render(withProviders(<CancelOrderButton order={baseOrder} />))
    await user.click(screen.getByRole("button", { name: "Отменить заказ" }))
    const confirmButtons = await screen.findAllByRole("button", { name: "Отменить заказ" })
    const confirm = confirmButtons.find(
      (b) => b.getAttribute("data-slot") === "alert-dialog-action",
    )!
    await user.click(confirm)

    await waitFor(() => {
      expect(toastSpies.success).toHaveBeenCalledWith("Заказ отменён", undefined)
    })
  })
})
