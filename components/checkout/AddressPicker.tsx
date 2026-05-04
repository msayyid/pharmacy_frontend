"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { Controller, useFormContext } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import type { Address } from "@/lib/api/types"
import type { CheckoutFormValues } from "@/lib/checkout/schema"
import { formatPhoneDisplay } from "@/lib/format/phone"
import { cn } from "@/lib/utils"

// AddressPicker — DESIGN §12.8 + §11.3.
// Two surfaces in one component:
//   1. Saved addresses list (RadioGroup) — selecting one writes
//      `address_id` into the form and clears `address`.
//   2. "Use a new address" radio — opens an inline mini-form that
//      writes `address` into the form and clears `address_id`.
//
// Mutex enforced by the schema's superRefine; we additionally reset
// the inactive field on radio change to keep the body shape clean.
//
// Skipped entirely when delivery_method === "pickup". The CheckoutForm
// orchestrator hides this section in that case.

const NEW_ADDRESS_OPTION = "__new__"

export interface AddressPickerProps {
  addresses: ReadonlyArray<Address>
}

export function AddressPicker({ addresses }: AddressPickerProps) {
  const t = useTranslations()
  const { control, register, setValue, watch, formState } = useFormContext<CheckoutFormValues>()

  const selectedId = watch("address_id")
  const inlineSelected = watch("address")
  const radioValue =
    selectedId !== undefined
      ? String(selectedId)
      : inlineSelected !== undefined
        ? NEW_ADDRESS_OPTION
        : ""

  function onPickSaved(addressId: number) {
    setValue("address_id", addressId, { shouldValidate: true, shouldDirty: true })
    setValue("address", undefined, { shouldValidate: true, shouldDirty: true })
  }

  function onPickNew() {
    setValue("address_id", undefined, { shouldValidate: false, shouldDirty: true })
    setValue(
      "address",
      {
        city: "Бишкек",
        address_line: "",
      },
      { shouldValidate: false, shouldDirty: true },
    )
  }

  const showInline = radioValue === NEW_ADDRESS_OPTION

  return (
    <section
      data-slot="checkout-address-picker"
      aria-labelledby="checkout-address-picker-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="checkout-address-picker-heading" className="text-h4 text-ink-900 font-semibold">
        {t("checkout.delivery.address_label")}
      </h2>

      <RadioGroup
        value={radioValue}
        onValueChange={(value) => {
          if (value === NEW_ADDRESS_OPTION) onPickNew()
          else if (value) onPickSaved(Number(value))
        }}
        className="grid gap-2"
      >
        {addresses.map((address) => {
          const id = `checkout-address-${address.id}`
          const checked = radioValue === String(address.id)
          return (
            <Label
              key={address.id}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                checked
                  ? "border-primary bg-primary/5"
                  : "border-ink-100 bg-surface-card hover:border-ink-200",
              )}
            >
              <RadioGroupItem id={id} value={String(address.id)} className="mt-1" />
              <div className="flex flex-col gap-0.5">
                {address.label ? (
                  <span className="text-body text-ink-900 font-medium">{address.label}</span>
                ) : null}
                <span className="text-body-sm text-ink-700">
                  {address.city}, {address.address_line}
                </span>
                {address.recipient_phone ? (
                  <span className="text-caption text-ink-500 tabular-nums">
                    {formatPhoneDisplay(address.recipient_phone)}
                  </span>
                ) : null}
              </div>
            </Label>
          )
        })}

        <Label
          htmlFor="checkout-address-new"
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
            radioValue === NEW_ADDRESS_OPTION
              ? "border-primary bg-primary/5"
              : "border-ink-100 bg-surface-card hover:border-ink-200",
          )}
        >
          <RadioGroupItem id="checkout-address-new" value={NEW_ADDRESS_OPTION} />
          <span className="text-body text-ink-900">{t("checkout.address_picker.new_address")}</span>
        </Label>
      </RadioGroup>

      {showInline ? (
        <div
          data-slot="checkout-address-inline"
          className="border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="checkout-address-line">{t("checkout.delivery.address_label")}</Label>
              <Controller
                control={control}
                name="address.address_line"
                render={({ field }) => (
                  <Textarea
                    id="checkout-address-line"
                    rows={2}
                    placeholder="мкр Асанбай, дом 12, кв 45"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(formState.errors.address?.address_line) || undefined}
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkout-address-city">Город</Label>
              <Input
                id="checkout-address-city"
                {...register("address.city")}
                aria-invalid={Boolean(formState.errors.address?.city) || undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkout-address-landmark">Ориентир</Label>
              <Input
                id="checkout-address-landmark"
                placeholder={t("checkout.delivery.landmark_hint")}
                {...register("address.landmark")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkout-address-apartment">Квартира</Label>
              <Input id="checkout-address-apartment" {...register("address.apartment")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkout-address-floor">Этаж</Label>
              <Input id="checkout-address-floor" {...register("address.floor")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkout-address-entrance">Подъезд</Label>
              <Input id="checkout-address-entrance" {...register("address.entrance")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkout-address-intercom">Домофон</Label>
              <Input id="checkout-address-intercom" {...register("address.intercom_code")} />
            </div>
          </div>
        </div>
      ) : null}

      {formState.errors.address_id ? (
        <p className="text-caption text-danger-500" role="alert">
          {t(formState.errors.address_id.message ?? "error.generic")}
        </p>
      ) : null}
    </section>
  )
}
