"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api/errors"
import { apiClient } from "@/lib/api/client"
import { BRAND } from "@/lib/brand"
import { formatPhoneDisplay } from "@/lib/format/phone"
import type { Locale } from "@/i18n/config"
import type { UserMe } from "@/lib/api/types"

// PATCH /me payload schema. Matches the backend's UserMeUpdate (extra="forbid"):
//   first_name?: string (max 80)
//   last_name?: string (max 80)
//   email?: EmailStr  (or null to clear — backend permits omission)
//   preferred_language?: "ru" | "ky" | "en"
//
// Phone is read-only per Q-8 (post-MVP for phone-change).
const ProfileSchema = z.object({
  first_name: z.string().max(80).optional().or(z.literal("")),
  last_name: z.string().max(80).optional().or(z.literal("")),
  email: z.string().email({ message: "error.invalid_email" }).optional().or(z.literal("")),
  preferred_language: z.enum(["ru", "ky", "en"]),
})

type ProfileFormValues = z.infer<typeof ProfileSchema>

export interface ProfileFormProps {
  user: UserMe
  locale: Locale
}

export function ProfileForm({ user, locale }: ProfileFormProps) {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<boolean>(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      preferred_language: (user.preferred_language as Locale | undefined) ?? locale,
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      // Map empty strings to null/omitted per backend's `extra="forbid"`.
      const body: Record<string, unknown> = {
        preferred_language: values.preferred_language,
      }
      if (values.first_name !== undefined) body.first_name = values.first_name || null
      if (values.last_name !== undefined) body.last_name = values.last_name || null
      if (values.email !== undefined) body.email = values.email || null

      const response = await apiClient.PATCH(
        "/api/v1/me" as never,
        {
          body,
        } as never,
      )
      return (response as { data?: UserMe }).data
    },
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData(["me"], updated)
      }
      setSuccess(true)
      setSubmitError(null)
    },
    onError: (error) => {
      setSuccess(false)
      setSubmitError(error instanceof ApiError ? `error.${error.code}` : "error.generic")
    },
  })

  function onSubmit(values: ProfileFormValues) {
    setSuccess(false)
    setSubmitError(null)
    mutation.mutate(values)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {success ? (
        <p className="text-body-sm text-success-500" role="status">
          {/* Generic confirmation copy — Phase 6+ may add a dedicated key. */}
          {t("auth.otp.sent").includes("Код") ? "Сохранено." : "Saved."}
        </p>
      ) : null}
      {submitError ? (
        <p className="text-body-sm text-danger-500" role="alert">
          {t(submitError)}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="first_name">{t("checkout.delivery.recipient_label")}</Label>
          <Input id="first_name" {...form.register("first_name")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="last_name">{t("checkout.delivery.recipient_label")} (фамилия)</Label>
          <Input id="last_name" {...form.register("last_name")} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-caption text-danger-500" role="alert">
              {t(form.formState.errors.email.message ?? "error.generic")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="preferred_language">{t("ui.locale.switch_to", { locale: "" })}</Label>
          <select
            id="preferred_language"
            className="border-ink-200 bg-surface-card text-body h-9 rounded-md border px-3"
            {...form.register("preferred_language")}
          >
            <option value="ru">{t("ui.locale.ru")}</option>
            <option value="ky">{t("ui.locale.ky")}</option>
            <option value="en">{t("ui.locale.en")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Phone</Label>
          <p className="text-body text-ink-700 tabular-nums">{formatPhoneDisplay(user.phone)}</p>
          <p className="text-caption text-ink-500">
            {/* Q-8: phone-change is post-MVP. Direct customers to support. */}
            Чтобы сменить номер,{" "}
            <a href={`tel:${BRAND.supportPhone.replace(/\s+/g, "")}`} className="underline">
              позвоните нам
            </a>
            .
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending}>
          {t("checkout.confirm_button")}
        </Button>
      </div>
    </form>
  )
}
