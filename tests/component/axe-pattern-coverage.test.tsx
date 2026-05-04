import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { OrderListPagination } from "@/components/order/OrderListPagination"
import { OrderListRow } from "@/components/order/OrderListRow"
import { StatusPip } from "@/components/order/StatusPip"
import { unflattenMessages } from "@/i18n/unflatten"
import type { OrderListItem } from "@/lib/api/types"
import ru from "@/messages/ru.json"

// Phase 11E — axe-core sweep on representative design patterns.
//
// We assert zero violations of WCAG-relevant rules on a curated set of
// components that cover the design language's core surfaces:
//   - EmptyState  (DESIGN §14.1) — empty list / no data
//   - ErrorState  (DESIGN §14.3) — block-level error with retry
//   - StatusPip   (DESIGN §13.x) — colored pill
//   - OrderListRow / OrderListPagination — paginated list pattern
//
// Why a centralized axe file rather than one assertion per existing
// component test? (a) each existing test owns its own provider stack and
// jsdom shims, so adding axe to all of them is high friction; (b) a
// dedicated axe contract is easier to extend and easier for reviewers
// to audit. If a future pattern breaks a11y, this file fails fast.
//
// E2E full-page axe scans live in tests/e2e/a11y-flow.spec.ts.

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// jsdom can't compute color-contrast accurately (no canvas). The e2e
// a11y spec runs real-browser color-contrast via @axe-core/playwright;
// here we focus on structural/semantic rules.
const AXE_OPTIONS = {
  rules: {
    "color-contrast": { enabled: false },
  },
} as const

function withIntl(node: React.ReactNode) {
  const queryClient = new QueryClient({
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

describe("axe — feedback surfaces", () => {
  it("EmptyState renders with zero violations", async () => {
    const { container } = render(
      withIntl(<EmptyState title="Пока ничего нет" body="Загляните позже" />),
    )
    const results = await axe(container, AXE_OPTIONS)
    expect(results).toHaveNoViolations()
  })

  it("ErrorState with retry button renders with zero violations", async () => {
    const { container } = render(
      withIntl(
        <ErrorState
          title="Не удалось загрузить"
          body="Проверьте подключение"
          code="network"
          cta={<button type="button">Повторить</button>}
        />,
      ),
    )
    const results = await axe(container, AXE_OPTIONS)
    expect(results).toHaveNoViolations()
  })
})

describe("axe — status pill", () => {
  it.each(["pending", "confirmed", "preparing", "delivered", "cancelled"] as const)(
    "StatusPip[%s] renders with zero violations",
    async (status) => {
      const { container } = render(withIntl(<StatusPip status={status} />))
      const results = await axe(container, AXE_OPTIONS)
      expect(results).toHaveNoViolations()
    },
  )
})

describe("axe — order list row + pagination", () => {
  const order: OrderListItem = {
    order_number: "PH-2026-12345",
    status: "delivered",
    payment_status: "paid",
    delivery_method: "delivery",
    item_count: 3,
    total: "1250.00",
    currency: "KGS",
    placed_at: "2026-05-04T09:30:00Z",
  } as unknown as OrderListItem

  it("OrderListRow renders with zero violations", async () => {
    const { container } = render(withIntl(<OrderListRow order={order} locale="ru" />))
    const results = await axe(container, AXE_OPTIONS)
    expect(results).toHaveNoViolations()
  })

  it("OrderListPagination renders with zero violations", async () => {
    const { container } = render(
      withIntl(<OrderListPagination currentPage={3} totalPages={10} onChange={() => {}} />),
    )
    const results = await axe(container, AXE_OPTIONS)
    expect(results).toHaveNoViolations()
  })
})
