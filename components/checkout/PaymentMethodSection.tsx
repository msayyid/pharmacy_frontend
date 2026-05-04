"use client"

import { useTranslations } from "next-intl"
import * as React from "react"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// PaymentMethodSection — DESIGN §12.8.
//
// HARDCODED: "cash_on_delivery" is the only payment method exposed to
// customers in v1.0.0-rc1. Backend's PaymentMethod enum lists 7 values
// (cash_on_delivery, card_online, card_terminal, mbank, optima, balance,
// elsom), but card_online depends on the Freedom Pay integration (Q14)
// which is a deferred production blocker. Surfacing the radio without
// the integration would land customers on a broken redirect.
//
// Per Phase 0 Q-2 + Phase 9 plan D6: render the COD option as the only
// selectable radio with a hint line ("Сейчас доступна только оплата при
// получении"). When Freedom Pay ships, this component grows a second
// radio and the lib/checkout/schema.ts payment_method literal widens.
// Keep both edits coupled — the schema is the contract.

export function PaymentMethodSection() {
  const t = useTranslations()

  return (
    <section
      data-slot="checkout-payment-method"
      aria-labelledby="checkout-payment-method-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="checkout-payment-method-heading" className="text-h4 text-ink-900 font-semibold">
        {t("checkout.section.payment")}
      </h2>
      <RadioGroup value="cash_on_delivery" className="grid gap-2">
        <Label
          htmlFor="checkout-payment-cod"
          className="border-primary bg-primary/5 flex cursor-default items-center gap-3 rounded-lg border p-4"
        >
          <RadioGroupItem id="checkout-payment-cod" value="cash_on_delivery" />
          <span className="text-body text-ink-900">{t("checkout.payment.cod")}</span>
        </Label>
      </RadioGroup>
      <p className="text-caption text-ink-500">{t("checkout.payment.cod_only_hint")}</p>
    </section>
  )
}
