"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

import { CartLine } from "@/components/cart/CartLine"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api/errors"
import type { Locale } from "@/i18n/config"
import { useCart } from "@/lib/cart/queries"
import { useCartUiStore } from "@/lib/cart/store"
import { formatPrice } from "@/lib/format/price"
import { cn } from "@/lib/utils"

// CartDrawer — DESIGN §12.7 + Phase 8 plan D2. Sheet sliding from the
// right on desktop only; mobile users navigate to /cart directly via
// CartIconWithBadge's Link branch.
//
// Auto-closes on route change so navigating to PDP / category from a
// product link inside the drawer dismisses it correctly. The Sheet
// component already handles outside-click + Esc key.
//
// Read-only renders the cart list + a slim totals summary + a "Перейти
// к оформлению" CTA → /cart (full page) where checkout begins. The
// drawer is intentionally NOT the place for checkout; full-page cart
// gives space for price-changed banners + OOS UX without cramping.

export interface CartDrawerProps {
  locale: Locale
}

export function CartDrawer({ locale }: CartDrawerProps) {
  const t = useTranslations()
  const pathname = usePathname()
  const isOpen = useCartUiStore((s) => s.isDrawerOpen)
  const closeDrawer = useCartUiStore((s) => s.closeDrawer)

  const { data: cart, isPending, error, refetch } = useCart()

  // Auto-close on route change. Comparing pathname captures locale
  // switches + product-link clicks from inside the drawer.
  const prevPathRef = React.useRef(pathname)
  React.useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname
      closeDrawer()
    }
  }, [pathname, closeDrawer])

  const items = cart?.items ?? []
  const subtotal = cart?.totals.subtotal !== undefined ? Number(cart.totals.subtotal) : 0

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-ink-100 border-b px-6 py-4">
          <SheetTitle className="text-h3 text-ink-900 font-semibold">{t("nav.cart")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isPending ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : error ? (
            <ErrorState
              title={t("error.generic")}
              body={error instanceof ApiError ? `error.${error.code}` : t("error.network")}
              cta={
                <Button variant="outline" onClick={() => refetch()}>
                  {t("error.generic")}
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState
              title={t("cart.empty.title")}
              cta={
                <Button asChild onClick={closeDrawer}>
                  <Link href={`/${locale}/categories`}>{t("cart.empty.cta")}</Link>
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id}>
                  <CartLine item={item} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <div
            className={cn(
              "border-ink-100 bg-surface-card border-t px-6 py-4",
              "flex flex-col gap-3",
            )}
          >
            <div className="text-body flex items-center justify-between gap-3">
              <span className="text-ink-700">{t("checkout.totals.subtotal")}</span>
              <span className="text-ink-900 font-semibold tabular-nums">
                {formatPrice(subtotal, locale)}
              </span>
            </div>
            <Button asChild onClick={closeDrawer} className="w-full">
              <Link href={`/${locale}/cart`}>{t("cart.checkout_cta")}</Link>
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
