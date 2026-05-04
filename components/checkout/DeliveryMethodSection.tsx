"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { Controller, useFormContext } from "react-hook-form"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

import type { CheckoutFormValues } from "@/lib/checkout/schema"

// DeliveryMethodSection — DESIGN §12.8 single-page checkout, first section.
// Two options per backend's enum: "delivery" | "pickup". Card-style
// radio surface so the CTA itself is the touch target on mobile.
//
// Cold-chain auto-toggle to "pickup" when a cold-chain item is in cart
// is owned by the CheckoutForm orchestrator (Phase 9 9C), not this
// component — this section is presentational.

export function DeliveryMethodSection() {
  const t = useTranslations()
  const { control } = useFormContext<CheckoutFormValues>()

  return (
    <section
      data-slot="checkout-delivery-method"
      aria-labelledby="checkout-delivery-method-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="checkout-delivery-method-heading" className="text-h4 text-ink-900 font-semibold">
        {t("checkout.section.delivery")}
      </h2>
      <Controller
        control={control}
        name="delivery_method"
        render={({ field }) => (
          <RadioGroup
            value={field.value}
            onValueChange={field.onChange}
            className="grid gap-2 sm:grid-cols-2"
          >
            <DeliveryRadio
              value="delivery"
              label={t("checkout.delivery_method.delivery")}
              checked={field.value === "delivery"}
            />
            <DeliveryRadio
              value="pickup"
              label={t("checkout.delivery_method.pickup")}
              checked={field.value === "pickup"}
            />
          </RadioGroup>
        )}
      />
    </section>
  )
}

interface DeliveryRadioProps {
  value: "delivery" | "pickup"
  label: string
  checked: boolean
}

function DeliveryRadio({ value, label, checked }: DeliveryRadioProps) {
  const id = `checkout-delivery-${value}`
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
        checked
          ? "border-primary bg-primary/5"
          : "border-ink-100 bg-surface-card hover:border-ink-200",
      )}
    >
      <RadioGroupItem id={id} value={value} />
      <span className="text-body text-ink-900">{label}</span>
    </Label>
  )
}
