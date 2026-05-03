"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useLocale, useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { Controller, useForm } from "react-hook-form"

import { OtpInput } from "@/components/auth/OtpInput"
import { PhoneInput } from "@/components/auth/PhoneInput"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { Locale } from "@/i18n/config"
import { ApiError } from "@/lib/api/errors"
import { apiClient } from "@/lib/api/client"
import { sanitizeReturnUrl } from "@/lib/auth/return-url"
import { useAuthStore } from "@/lib/auth/store"
import { mergeGuestCartIntoUser, type MergeFailedItem } from "@/lib/cart/merge"
import { formatPhoneE164 } from "@/lib/format/phone"

import { codeSchema, phoneSchema, type CodeFormValues, type PhoneFormValues } from "./schema"

// Phase 5 OTP flow — single page, two states (PHONE → CODE).
//
// Phase 5D will:
//   1. Wire the cart-merge sequential re-add at OTP-verify success.
//   2. Sanitize the `?return=` query param via lib/auth/return-url.ts before
//      using it as the redirect target.
//
// For now this page redirects unconditionally to `/[locale]/account` after
// success. The TODO markers below pin the seams.

const RESEND_COUNTDOWN_SECONDS = 60

type Step = "phone" | "code"

export default function OtpPage() {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const setTokens = useAuthStore((s) => s.setTokens)

  const locale = useLocale() as Locale

  const [step, setStep] = React.useState<Step>("phone")
  const [phone, setPhone] = React.useState<string>("")
  const [resendSeconds, setResendSeconds] = React.useState<number>(0)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [mergeFailures, setMergeFailures] = React.useState<MergeFailedItem[]>([])

  // Resend countdown driver.
  React.useEffect(() => {
    if (resendSeconds <= 0) return
    const handle = window.setInterval(() => {
      setResendSeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(handle)
  }, [resendSeconds])

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
    mode: "onBlur",
  })

  const codeForm = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
    mode: "onSubmit",
  })

  async function requestCode(rawPhone: string) {
    const e164 = formatPhoneE164(rawPhone)
    if (!e164) {
      phoneForm.setError("phone", { message: "error.invalid_phone" })
      return null
    }
    setSubmitError(null)
    try {
      await apiClient.POST(
        "/api/v1/auth/otp/request" as never,
        {
          body: { phone: e164 },
        } as never,
      )
      return e164
    } catch (error) {
      const message = error instanceof ApiError ? `error.${error.code}` : "error.generic"
      setSubmitError(message)
      return null
    }
  }

  async function onPhoneSubmit(values: PhoneFormValues) {
    const e164 = await requestCode(values.phone)
    if (!e164) return
    setPhone(e164)
    setResendSeconds(RESEND_COUNTDOWN_SECONDS)
    setStep("code")
  }

  async function onResend() {
    if (resendSeconds > 0 || !phone) return
    const e164 = await requestCode(phone)
    if (e164) setResendSeconds(RESEND_COUNTDOWN_SECONDS)
  }

  async function onCodeSubmit(values: CodeFormValues) {
    setSubmitError(null)
    try {
      const verifyResponse = await apiClient.POST(
        "/api/v1/auth/otp/verify" as never,
        { body: { phone, code: values.code } } as never,
      )
      const data = (verifyResponse as { data?: unknown }).data as
        | { access_token: string; refresh_token: string; expires_in: number }
        | undefined
      if (!data) {
        setSubmitError("error.generic")
        return
      }

      // Stash refresh in HttpOnly cookie at our origin.
      const setRes = await fetch("/api/auth/set-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!setRes.ok) {
        setSubmitError("error.generic")
        return
      }

      setTokens(data.access_token, data.expires_in)

      // Cart-merge workaround per DECISION_LOG.md 2026-05-03 (OQ-16).
      // Phase 5 wires the call with an empty guest-items list — there is no
      // cart UI yet. Phase 8 (Cart) will plumb the real cache snapshot from
      // TanStack Query so the merge actually re-adds guest items.
      const merge = await mergeGuestCartIntoUser({
        guestItems: [],
        client: apiClient,
      })
      if (merge.failed.length > 0) {
        setMergeFailures(merge.failed)
      }

      // Sanitize ?return= via the open-redirect-hardened helper (R-F).
      // Falls back to /[locale]/account on any sanitization failure.
      const target = sanitizeReturnUrl({
        raw: searchParams.get("return"),
        locale,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      })
      router.replace(target)
    } catch (error) {
      const message = error instanceof ApiError ? `error.${error.code}` : "error.generic"
      setSubmitError(message)
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink-900 font-semibold">{t("auth.otp.title")}</h1>
        {submitError ? (
          <p className="text-body-sm text-danger-500" role="alert">
            {t(submitError)}
          </p>
        ) : null}
        {mergeFailures.length > 0 ? (
          <p className="text-body-sm text-warning-500" role="status">
            {/* Generic — Phase 8 will replace with a richer per-item list
                once the cart UI is in place. */}
            {t("error.generic")}
          </p>
        ) : null}
      </header>

      {step === "phone" ? (
        <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone-input">{t("auth.otp.title")}</Label>
            <Controller
              control={phoneForm.control}
              name="phone"
              render={({ field, fieldState }) => (
                <PhoneInput
                  id="phone-input"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={Boolean(fieldState.error)}
                />
              )}
            />
            {phoneForm.formState.errors.phone ? (
              <p className="text-caption text-danger-500" role="alert">
                {t(phoneForm.formState.errors.phone.message ?? "error.generic")}
              </p>
            ) : null}
          </div>
          <Button type="submit" loading={phoneForm.formState.isSubmitting}>
            {t("auth.otp.send_button")}
          </Button>
        </form>
      ) : (
        <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="flex flex-col gap-4">
          <p className="text-body text-ink-600">{t("auth.otp.sent")}</p>
          <p className="text-body-sm text-ink-500 tabular-nums">{phone}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp-input">{t("auth.otp.code_label")}</Label>
            <Controller
              control={codeForm.control}
              name="code"
              render={({ field, fieldState }) => (
                <OtpInput
                  value={field.value}
                  onChange={field.onChange}
                  invalid={Boolean(fieldState.error)}
                  ariaLabel={t("auth.otp.code_label")}
                />
              )}
            />
            {codeForm.formState.errors.code ? (
              <p className="text-caption text-danger-500" role="alert">
                {t(codeForm.formState.errors.code.message ?? "error.generic")}
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-between">
            <Button type="button" variant="link" onClick={onResend} disabled={resendSeconds > 0}>
              {resendSeconds > 0
                ? t("auth.otp.resend_in", { seconds: resendSeconds })
                : t("auth.otp.send_button")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("phone")
                setSubmitError(null)
                codeForm.reset({ code: "" })
              }}
            >
              {t("auth.otp.return_to_phone")}
            </Button>
          </div>
          <Button type="submit" loading={codeForm.formState.isSubmitting}>
            {t("auth.otp.verify_button")}
          </Button>
        </form>
      )}
    </main>
  )
}
