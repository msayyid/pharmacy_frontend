"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/feedback/ErrorState"
import { ApiError } from "@/lib/api/errors"
import { apiClient } from "@/lib/api/client"
import { useAuthStore } from "@/lib/auth/store"
import type { Locale } from "@/i18n/config"
import type { UserMe } from "@/lib/api/types"

import { ProfileForm } from "./profile-form"

// Account profile page — Client Component (D11).
//
// Soft-render: TanStack Query fetches /me; the client fetcher's 401
// interceptor handles silent refresh; if refresh fails, the middleware's
// hard-gate redirect kicks in on the next navigation.
//
// Logout placement: this page is the entry point for now (D13). Phase 6's
// Header component will host the logout button alongside other navigation.

export default function AccountPage() {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const router = useRouter()
  const clearAuth = useAuthStore((s) => s.clear)

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await apiClient.GET("/api/v1/me" as never)
      return (response as { data?: UserMe }).data
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      })
    },
    onSettled: () => {
      clearAuth()
      router.replace(`/${locale}`)
    },
  })

  if (meQuery.isPending) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </main>
    )
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
        <ErrorState
          title={t("error.generic")}
          body={
            meQuery.error instanceof ApiError
              ? t(`error.${meQuery.error.code}`)
              : t("error.network")
          }
          {...(meQuery.error instanceof ApiError ? { code: meQuery.error.code } : {})}
        />
      </main>
    )
  }

  const user = meQuery.data

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-h1 text-ink-900 font-semibold">{t("brand.name")}</h1>
        <Button
          variant="ghost"
          onClick={() => logoutMutation.mutate()}
          loading={logoutMutation.isPending}
        >
          Выйти
        </Button>
      </header>

      <ProfileForm user={user} locale={locale} />

      <nav className="border-ink-200 border-t pt-4">
        <a
          href={`/${locale}/account/addresses`}
          className="text-body text-brand-500 hover:underline"
        >
          {t("checkout.delivery.address_label")} →
        </a>
      </nav>
    </main>
  )
}
