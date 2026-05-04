"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import * as React from "react"

import { CheckoutForm, useCheckoutPrerequisites } from "@/components/checkout/CheckoutForm"
import { ErrorState } from "@/components/feedback/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import type { Locale } from "@/i18n/config"
import { ApiError } from "@/lib/api/errors"

// /[locale]/checkout — single-page checkout (DESIGN §12.8).
//
// Architecture decisions baked in by the Phase 9 plan:
//
//   D2: Client Component. The orchestrator depends on RHF + TanStack
//       Query + sonner — all client-only. Server-rendering this page
//       would force a round-trip just to redirect on empty cart, vs.
//       the smoother client-side guard below.
//
//   D3: Empty-cart guard is PAGE-LEVEL, not in middleware. Middleware
//       only knows about the auth cookie; cart membership is
//       determined by /api/v1/cart, which middleware can't reach
//       without forwarding cookies + adding a network hop. The page
//       fetches cart via useCheckoutPrerequisites, and on
//       cart.items.length === 0 (after queries settle) it
//       router.replace's to /[locale]/cart so the back-stack stays
//       clean.
//
//   D8: The auth wall is owned by middleware (HARD_GATED in
//       middleware.ts:45-50, extended in 9A.2). Reaching this page
//       implies the user has a valid `nookat_refresh` cookie.
//
// The orchestrator (CheckoutForm) takes resolved cart + me + addresses
// as props — this page is just the loader / guard / error boundary.

interface CheckoutPageProps {
  params: Promise<{ locale: string }>
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const { locale } = React.use(params)
  const t = useTranslations()
  const router = useRouter()

  const { cartQuery, meQuery, addressesQuery } = useCheckoutPrerequisites()

  const isPending = cartQuery.isPending || meQuery.isPending || addressesQuery.isPending

  // Empty-cart guard: only fires AFTER cart query has resolved. We
  // don't redirect during the in-flight phase to avoid a flash on
  // hydration when cart is still being fetched.
  const cartIsEmpty = cartQuery.data?.items.length === 0
  React.useEffect(() => {
    if (cartIsEmpty) {
      router.replace(`/${locale}/cart`)
    }
  }, [cartIsEmpty, locale, router])

  if (isPending) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </main>
    )
  }

  // Any of the three queries failed → block the form. Each query
  // throws ApiError per OP-13 (cart query throws by contract; me /
  // addresses throw via the openapi-fetch error middleware).
  const error = cartQuery.error ?? meQuery.error ?? addressesQuery.error
  if (error || !cartQuery.data || !meQuery.data) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
        <ErrorState
          title={t("error.generic")}
          body={error instanceof ApiError ? t(`error.${error.code}`) : t("error.network")}
          {...(error instanceof ApiError ? { code: error.code } : {})}
        />
      </main>
    )
  }

  // Empty cart → effect above redirects; render a brief skeleton in the
  // meantime to avoid a flash of the form.
  if (cartIsEmpty) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </main>
    )
  }

  return (
    <main
      className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12"
      data-locale={locale as Locale}
    >
      <header>
        <h1 className="text-h2 text-ink-900 font-semibold">{t("checkout.section.review")}</h1>
      </header>
      <CheckoutForm
        cart={cartQuery.data}
        user={meQuery.data}
        addresses={addressesQuery.data ?? []}
      />
    </main>
  )
}
