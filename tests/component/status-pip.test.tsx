import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { StatusPip } from "@/components/order/StatusPip"
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

describe("StatusPip", () => {
  it.each([
    ["pending", "Ожидает подтверждения"],
    ["confirmed", "Подтвержден"],
    ["preparing", "Готовится"],
    ["ready_for_pickup", "Готов к выдаче"],
    ["out_for_delivery", "В пути"],
    ["delivered", "Доставлен"],
    ["cancelled", "Отменен"],
    ["refunded", "Возврат"],
  ])("renders %s with localized label", (status, expected) => {
    render(withIntl(<StatusPip status={status} />))
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it("falls back to raw status string for unknown states", () => {
    render(withIntl(<StatusPip status="on_hold" />))
    expect(screen.getByText("on_hold")).toBeInTheDocument()
  })

  it("exposes data-status on the rendered element", () => {
    const { container } = render(withIntl(<StatusPip status="delivered" />))
    const pip = container.querySelector('[data-slot="status-pip"]')
    expect(pip).not.toBeNull()
    expect(pip).toHaveAttribute("data-status", "delivered")
  })
})
