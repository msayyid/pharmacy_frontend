"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { PhoneInput } from "@/components/auth/PhoneInput"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/errors"
import { apiClient } from "@/lib/api/client"
import { isValidPhone, formatPhoneE164 } from "@/lib/format/phone"
import type { Address } from "@/lib/api/types"

// AddressForm — create / edit address shared component.
// Backend AddressBase / AddressCreate / AddressUpdate (extra="forbid"):
//   label?       max 40
//   recipient_name?  max 160
//   recipient_phone? KG-validated when present
//   city         default "Bishkek", max 80
//   address_line required, free-text per PRODUCT §16.3
//   landmark?    free-text
//   is_default   boolean
//
// The phone field is OPTIONAL but if filled must validate (matches backend).

const AddressSchema = z.object({
  label: z.string().max(40).optional().or(z.literal("")),
  recipient_name: z.string().max(160).optional().or(z.literal("")),
  recipient_phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidPhone(v), { message: "error.invalid_phone" }),
  city: z.string().min(1, { message: "error.phone_required" }).max(80),
  address_line: z.string().min(1, { message: "error.phone_required" }),
  landmark: z.string().optional().or(z.literal("")),
  is_default: z.boolean(),
})

type AddressFormValues = z.infer<typeof AddressSchema>

export interface AddressFormProps {
  initial?: Address
  onSuccess: () => void
  onCancel: () => void
}

export function AddressForm({ initial, onSuccess, onCancel }: AddressFormProps) {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(AddressSchema),
    defaultValues: {
      label: initial?.label ?? "",
      recipient_name: initial?.recipient_name ?? "",
      recipient_phone: initial?.recipient_phone ?? "",
      city: initial?.city ?? "Bishkek",
      address_line: initial?.address_line ?? "",
      landmark: initial?.landmark ?? "",
      is_default: initial?.is_default ?? false,
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      // Map empty strings to null/omitted; normalize phone to E.164 when set.
      const normalizedPhone = values.recipient_phone
        ? formatPhoneE164(values.recipient_phone)
        : null
      const body: Record<string, unknown> = {
        label: values.label || null,
        recipient_name: values.recipient_name || null,
        recipient_phone: normalizedPhone,
        city: values.city,
        address_line: values.address_line,
        landmark: values.landmark || null,
        is_default: values.is_default,
      }

      if (initial) {
        const response = await apiClient.PATCH(
          "/api/v1/me/addresses/{address_id}" as never,
          { params: { path: { address_id: initial.id } }, body } as never,
        )
        return (response as { data?: Address }).data
      }
      const response = await apiClient.POST(
        "/api/v1/me/addresses" as never,
        {
          body,
        } as never,
      )
      return (response as { data?: Address }).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
      onSuccess()
    },
    onError: (error) => {
      setSubmitError(error instanceof ApiError ? `error.${error.code}` : "error.generic")
    },
  })

  function onSubmit(values: AddressFormValues) {
    setSubmitError(null)
    mutation.mutate(values)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {submitError ? (
        <p className="text-body-sm text-danger-500" role="alert">
          {t(submitError)}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="addr-label">Метка</Label>
          <Input id="addr-label" placeholder="Дом / Работа" {...form.register("label")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="addr-recipient-name">{t("checkout.delivery.recipient_label")}</Label>
          <Input id="addr-recipient-name" {...form.register("recipient_name")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="addr-recipient-phone">Телефон получателя</Label>
          <Controller
            control={form.control}
            name="recipient_phone"
            render={({ field, fieldState }) => (
              <PhoneInput
                id="addr-recipient-phone"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
              />
            )}
          />
          {form.formState.errors.recipient_phone ? (
            <p className="text-caption text-danger-500" role="alert">
              {t(form.formState.errors.recipient_phone.message ?? "error.generic")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="addr-city">Город</Label>
          <Input id="addr-city" {...form.register("city")} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="addr-line">{t("checkout.delivery.address_label")}</Label>
          <Textarea
            id="addr-line"
            rows={2}
            placeholder="мкр Асанбай, дом 12, кв 45"
            {...form.register("address_line")}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="addr-landmark">Ориентир</Label>
          <Input
            id="addr-landmark"
            placeholder={t("checkout.delivery.landmark_hint")}
            {...form.register("landmark")}
          />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Controller
            control={form.control}
            name="is_default"
            render={({ field }) => (
              <Switch id="addr-default" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="addr-default">Использовать по умолчанию</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("auth.otp.return_to_phone")}
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {t("checkout.confirm_button")}
        </Button>
      </div>
    </form>
  )
}
