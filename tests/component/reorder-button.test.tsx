import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ReorderButton } from "@/components/order/ReorderButton"
import { unflattenMessages } from "@/i18n/unflatten"
import { ApiError } from "@/lib/api/errors"
import type { OrderRead, ReorderResponseLine } from "@/lib/api/types"
import { cartQueryKey } from "@/lib/cart/queries"
import ru from "@/messages/ru.json"

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    POST: vi.fn(),
  },
}))

const toastSpies = {
  success: vi.fn(),
  message: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}
vi.mock("sonner", () => ({
  toast: {
    success: (msg: string, opts?: unknown) => toastSpies.success(msg, opts),
    message: (msg: string, opts?: unknown) => toastSpies.message(msg, opts),
    warning: (msg: string, opts?: unknown) => toastSpies.warning(msg, opts),
    error: (msg: string, opts?: unknown) => toastSpies.error(msg, opts),
  },
}))

const routerPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}))

import { apiClient } from "@/lib/api/client"

const baseOrder: OrderRead = {
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

function line(added: boolean, reason: ReorderResponseLine["reason"]): ReorderResponseLine {
  return {
    product_id: null,
    product_name_snapshot: "Парацетамол 500мг 12 таб",
    product_sku_snapshot: "PAR-500-12",
    quantity_requested: 1,
    added_to_cart: added,
    reason,
    snapshot_price: null,
    current_price: null,
  }
}

function withProviders(node: React.ReactNode, client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  return (
    <QueryClientProvider client={queryClient}>
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

describe("ReorderButton", () => {
  beforeEach(() => {
    vi.mocked(apiClient.POST).mockReset()
    Object.values(toastSpies).forEach((spy) => spy.mockReset())
    routerPush.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("full success: success toast + navigates to /cart", async () => {
    vi.mocked(apiClient.POST).mockResolvedValueOnce({
      data: {
        cart_id: "00000000-0000-0000-0000-000000000001",
        lines: [line(true, "added"), line(true, "added")],
      },
    } as never)

    const user = userEvent.setup()
    render(withProviders(<ReorderButton order={baseOrder} locale="ru" />))
    await user.click(screen.getByRole("button", { name: /Заказать снова/ }))

    await waitFor(() => {
      expect(toastSpies.success).toHaveBeenCalledWith("Все позиции добавлены в корзину", undefined)
    })
    expect(routerPush).toHaveBeenCalledWith("/ru/cart")
  })

  it("partial success: message toast with added/total counts", async () => {
    vi.mocked(apiClient.POST).mockResolvedValueOnce({
      data: {
        cart_id: "00000000-0000-0000-0000-000000000001",
        lines: [line(true, "added"), line(false, "out_of_stock"), line(true, "price_changed")],
      },
    } as never)

    const user = userEvent.setup()
    render(withProviders(<ReorderButton order={baseOrder} locale="ru" />))
    await user.click(screen.getByRole("button", { name: /Заказать снова/ }))

    await waitFor(() => {
      expect(toastSpies.message).toHaveBeenCalled()
    })
    const firstCall = toastSpies.message.mock.calls[0]
    expect(firstCall).toBeDefined()
    const calledWith = firstCall![0] as string
    expect(calledWith).toContain("2")
    expect(calledWith).toContain("3")
    expect(routerPush).toHaveBeenCalledWith("/ru/cart")
  })

  it("empty success: warning toast + still navigates to /cart", async () => {
    vi.mocked(apiClient.POST).mockResolvedValueOnce({
      data: {
        cart_id: "00000000-0000-0000-0000-000000000001",
        lines: [line(false, "out_of_stock"), line(false, "product_deleted")],
      },
    } as never)

    const user = userEvent.setup()
    render(withProviders(<ReorderButton order={baseOrder} locale="ru" />))
    await user.click(screen.getByRole("button", { name: /Заказать снова/ }))

    await waitFor(() => {
      expect(toastSpies.warning).toHaveBeenCalledWith(
        expect.stringContaining("Все товары из заказа"),
        undefined,
      )
    })
    expect(routerPush).toHaveBeenCalledWith("/ru/cart")
  })

  it("error: error toast and stays on the current page", async () => {
    vi.mocked(apiClient.POST).mockRejectedValueOnce(
      new ApiError({ code: "order_not_found", status: 404, context: {} }),
    )

    const user = userEvent.setup()
    render(withProviders(<ReorderButton order={baseOrder} locale="ru" />))
    await user.click(screen.getByRole("button", { name: /Заказать снова/ }))

    await waitFor(() => {
      expect(toastSpies.error).toHaveBeenCalledWith("Заказ не найден", undefined)
    })
    expect(routerPush).not.toHaveBeenCalled()
  })

  it("invalidates cart query before navigating (Phase 8 D12 R-C)", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    // Seed the cart cache so we can detect invalidation.
    queryClient.setQueryData(cartQueryKey, { items: [] })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    vi.mocked(apiClient.POST).mockResolvedValueOnce({
      data: {
        cart_id: "00000000-0000-0000-0000-000000000001",
        lines: [line(true, "added")],
      },
    } as never)

    const user = userEvent.setup()
    render(withProviders(<ReorderButton order={baseOrder} locale="ru" />, queryClient))
    await user.click(screen.getByRole("button", { name: /Заказать снова/ }))

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/ru/cart")
    })
    // Invalidation occurred before push because the hook awaits it.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: cartQueryKey })
    const invalidateOrder = invalidateSpy.mock.invocationCallOrder[0]
    const pushOrder = routerPush.mock.invocationCallOrder[0]
    expect(invalidateOrder).toBeDefined()
    expect(pushOrder).toBeDefined()
    expect(invalidateOrder!).toBeLessThan(pushOrder!)
  })
})
