import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { PaymentMethodSection } from "@/components/checkout/PaymentMethodSection"
import { unflattenMessages } from "@/i18n/unflatten"
import ru from "@/messages/ru.json"

// PaymentMethodSection invariant: COD-only surface in v1.0.0-rc1.
// Per Phase 0 Q-2 + Phase 9 plan D6, the radio MUST NOT expose
// card_online or any other backend payment_method enum value, since
// Freedom Pay (Q14) is a deferred production blocker. Surfacing it
// would land customers on a broken redirect.
//
// This test is a regression guard: any future edit that surfaces a
// second radio option in this section will fail unless deliberately
// updated alongside lib/checkout/schema.ts (the payment_method
// literal must widen first; the schema is the contract).

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

describe("PaymentMethodSection (COD-only contract)", () => {
  it("renders exactly one radio option with value=cash_on_delivery", () => {
    render(withProvider(<PaymentMethodSection />))
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(1)
    expect(radios[0]).toHaveAttribute("value", "cash_on_delivery")
  })

  it("displays the COD-only hint copy", () => {
    render(withProvider(<PaymentMethodSection />))
    // "Сейчас доступна только оплата при получении"
    expect(screen.getByText(/Сейчас доступна только оплата при получении/)).toBeInTheDocument()
  })

  it("does NOT surface a card_online radio (regression guard)", () => {
    render(withProvider(<PaymentMethodSection />))
    expect(screen.queryByRole("radio", { name: /картой/i })).toBeNull()
    expect(screen.queryByDisplayValue("card_online")).toBeNull()
  })
})
