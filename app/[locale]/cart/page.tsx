"use client"

import { ShoppingCartIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

import { CartLine } from "@/components/cart/CartLine"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api/errors"
import type { Locale } from "@/i18n/config"
import { useCart } from "@/lib/cart/queries"
import { formatPrice } from "@/lib/format/price"
import { cn } from "@/lib/utils"

// /[locale]/cart — DESIGN §12.7 full-page cart. Replaces the Phase 6
// placeholder. Three render branches per Phase 8 plan:
//   - Loading: skeleton list + skeleton totals card
//   - Error: ErrorState with retry (per CLAUDE.md OP-13: cart query
//     throws on missing data, consumer renders error state)
//   - Empty (items.length === 0): EmptyState + "Continue shopping" CTA
//   - Populated: line list + sticky totals + checkout CTA
//
// Client component — uses useCart() which depends on the QueryClient
// context. The page-level auth gate doesn't apply (cart is anonymous-
// friendly per the cart-cookie pattern).

interface CartPageProps {
  params: Promise<{ locale: string }>
}

// Inline totals to avoid the RSC/client divide for CartTotals (which
// imports next-intl/server). For the /cart page we render totals
// client-side using the same formatPrice + i18n keys.
function CartTotalsClient({
  totals,
  locale,
}: {
  totals: NonNullable<ReturnType<typeof useCart>["data"]>["totals"]
  locale: Locale
}) {
  const t = useTranslations()
  const subtotal = Number(totals.subtotal)
  const deliveryFee =
    totals.delivery_fee !== null && totals.delivery_fee !== undefined
      ? Number(totals.delivery_fee)
      : null
  const discount = Number(totals.discount_amount)
  const total = totals.total !== null && totals.total !== undefined ? Number(totals.total) : null
  const freeDeliveryRemaining =
    totals.free_delivery_remaining !== null && totals.free_delivery_remaining !== undefined
      ? Number(totals.free_delivery_remaining)
      : null
  const showFreeDelivery = freeDeliveryRemaining !== null && freeDeliveryRemaining > 0

  return (
    <div
      data-slot="cart-totals"
      className={cn("border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-4")}
    >
      {showFreeDelivery ? (
        <p className="text-body-sm text-ink-600">
          {t("checkout.free_delivery_hint", { amount: freeDeliveryRemaining })}
        </p>
      ) : null}
      <dl className="text-body-sm flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-700">{t("checkout.totals.subtotal")}</dt>
          <dd className="text-ink-900 font-medium tabular-nums">{formatPrice(subtotal, locale)}</dd>
        </div>
        {discount > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-700">{t("checkout.totals.discount")}</dt>
            <dd className="text-success-700 font-medium tabular-nums">
              −{formatPrice(discount, locale)}
            </dd>
          </div>
        ) : null}
        {deliveryFee !== null ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-700">{t("checkout.totals.delivery")}</dt>
            <dd className="text-ink-900 font-medium tabular-nums">
              {formatPrice(deliveryFee, locale)}
            </dd>
          </div>
        ) : null}
        {total !== null ? (
          <div className="border-ink-100 flex items-center justify-between gap-3 border-t pt-2">
            <dt className="text-body text-ink-900 font-semibold">{t("checkout.totals.total")}</dt>
            <dd className="text-body text-ink-900 font-semibold tabular-nums">
              {formatPrice(total, locale)}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

import { use } from "react"

export default function CartPage({ params }: CartPageProps) {
  const { locale } = use(params)
  const t = useTranslations()
  const { data: cart, isPending, error, refetch } = useCart()

  const localeKey = locale as Locale

  if (isPending) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
        <h1 className="text-h1 text-ink-900 font-semibold">{t("nav.cart")}</h1>
        <ErrorState
          title={t("error.generic")}
          body={error instanceof ApiError ? `error.${error.code}` : t("error.network")}
          cta={
            <Button variant="outline" onClick={() => refetch()}>
              {t("error.generic")}
            </Button>
          }
        />
      </main>
    )
  }

  const items = cart?.items ?? []

  if (items.length === 0) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16 md:px-6 md:py-20">
        <EmptyState
          icon={ShoppingCartIcon}
          title={t("cart.empty.title")}
          cta={
            <Button asChild>
              <Link href={`/${locale}/categories`}>{t("cart.empty.cta")}</Link>
            </Button>
          }
        />
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
      <h1 className="text-h1 text-ink-900 font-semibold">{t("nav.cart")}</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <CartLine item={item} locale={localeKey} />
            </li>
          ))}
        </ul>

        <aside className="flex flex-col gap-4">
          {cart?.totals ? <CartTotalsClient totals={cart.totals} locale={localeKey} /> : null}
          {/* Phase 9 will replace this Link with the real checkout flow. */}
          <Button asChild className="w-full">
            <Link href={`/${locale}/checkout`}>{t("cart.checkout_cta")}</Link>
          </Button>
        </aside>
      </div>
    </main>
  )
}
