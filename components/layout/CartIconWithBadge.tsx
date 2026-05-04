"use client"

import { ShoppingCartIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

import { useCart } from "@/lib/cart/queries"
import { useCartUiStore } from "@/lib/cart/store"
import { cn } from "@/lib/utils"

// CartIconWithBadge — Phase 8 8C. Replaces the two stub cart icons from
// the Phase 6 Header.
//
// Per Phase 8 plan D8 + D16:
//   - Badge counts DISTINCT line items (cart.items.length), not
//     sum(quantities). "3" means "I have 3 different things to review,"
//     matching Amazon / Apteka.ru / Wildberries convention.
//   - Mobile: <Link href="/cart"> — full-page navigation.
//   - Desktop: <button onClick={openDrawer}> — Sheet drawer.
//   - Both viewports share the same badge logic; rendered as siblings
//     via Tailwind responsive classes.
//
// Subscribes to useCart() — first paint shows no badge until the query
// resolves (server might return an empty cart, in which case nothing to
// surface; or items.length > 0, then we paint the badge). Per
// CLAUDE.md OP-13 the query throws on error; here we treat error +
// loading the same (no badge), since a transient cart-fetch failure
// shouldn't show a stale badge from a previous session.

export interface CartIconWithBadgeProps {
  locale: string
  className?: string
}

export function CartIconWithBadge({ locale, className }: CartIconWithBadgeProps) {
  const t = useTranslations()
  const { data: cart } = useCart()
  const openDrawer = useCartUiStore((s) => s.openDrawer)

  const itemCount = cart?.items?.length ?? 0
  const showBadge = itemCount > 0

  return (
    <>
      <Link
        href={`/${locale}/cart`}
        aria-label={t("nav.cart")}
        className={cn(
          "relative inline-flex h-11 w-11 items-center justify-center rounded-md md:hidden",
          "text-ink-700 hover:bg-ink-50",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          className,
        )}
      >
        <ShoppingCartIcon aria-hidden="true" className="size-5" />
        {showBadge ? <Badge count={itemCount} /> : null}
      </Link>

      <button
        type="button"
        onClick={openDrawer}
        aria-label={t("nav.cart")}
        className={cn(
          "relative hidden h-11 w-11 items-center justify-center rounded-md md:inline-flex",
          "text-ink-700 hover:bg-ink-50",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          className,
        )}
      >
        <ShoppingCartIcon aria-hidden="true" className="size-5" />
        {showBadge ? <Badge count={itemCount} /> : null}
      </button>
    </>
  )
}

function Badge({ count }: { count: number }) {
  return (
    <span
      data-slot="cart-badge"
      aria-hidden="true"
      className={cn(
        "absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full px-1",
        "bg-brand-500 text-caption h-5 font-semibold text-white tabular-nums",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
