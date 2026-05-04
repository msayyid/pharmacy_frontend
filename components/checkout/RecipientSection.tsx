"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { Controller, useFormContext } from "react-hook-form"

import { PhoneInput } from "@/components/auth/PhoneInput"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { CheckoutFormValues } from "@/lib/checkout/schema"

// RecipientSection — DESIGN §12.8. Pre-fills name + phone from the
// authenticated /me payload; user can override per-order. Phone routes
// through the existing PhoneInput (KG validation + format-on-blur).

export function RecipientSection() {
  const t = useTranslations()
  const { control, register, formState } = useFormContext<CheckoutFormValues>()

  return (
    <section
      data-slot="checkout-recipient"
      aria-labelledby="checkout-recipient-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="checkout-recipient-heading" className="text-h4 text-ink-900 font-semibold">
        {t("checkout.section.recipient")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checkout-recipient-name">{t("checkout.delivery.recipient_label")}</Label>
          <Input
            id="checkout-recipient-name"
            autoComplete="name"
            aria-invalid={Boolean(formState.errors.recipient_name) || undefined}
            {...register("recipient_name")}
          />
          {formState.errors.recipient_name ? (
            <p className="text-caption text-danger-500" role="alert">
              {t(formState.errors.recipient_name.message ?? "error.generic")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checkout-recipient-phone">{t("branch.phone")}</Label>
          <Controller
            control={control}
            name="recipient_phone"
            render={({ field, fieldState }) => (
              <PhoneInput
                id="checkout-recipient-phone"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
              />
            )}
          />
          {formState.errors.recipient_phone ? (
            <p className="text-caption text-danger-500" role="alert">
              {t(formState.errors.recipient_phone.message ?? "error.generic")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
