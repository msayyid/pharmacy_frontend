"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { useFormContext } from "react-hook-form"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { CheckoutFormValues } from "@/lib/checkout/schema"

// NotesSection — DESIGN §12.8. Optional free-text customer note (max
// 2000 chars per backend PlaceOrderRequest.customer_notes). The label
// is borrowed from the parent section heading; the textarea uses a
// placeholder + visually-hidden label for screen readers.

export function NotesSection() {
  const t = useTranslations()
  const { register, formState } = useFormContext<CheckoutFormValues>()

  return (
    <section
      data-slot="checkout-notes"
      aria-labelledby="checkout-notes-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="checkout-notes-heading" className="text-h4 text-ink-900 font-semibold">
        {t("checkout.section.notes")}
      </h2>
      <Label htmlFor="checkout-customer-notes" className="sr-only">
        {t("checkout.section.notes")}
      </Label>
      <Textarea
        id="checkout-customer-notes"
        rows={3}
        maxLength={2000}
        placeholder={t("checkout.notes.placeholder")}
        aria-invalid={Boolean(formState.errors.customer_notes) || undefined}
        {...register("customer_notes")}
      />
    </section>
  )
}
