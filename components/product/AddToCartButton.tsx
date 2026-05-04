"use client"

import { Loader2Icon, ShoppingCartIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { useAddToCart } from "@/lib/cart/mutations"
import { useCartUiStore } from "@/lib/cart/store"
import { ApiError } from "@/lib/api/errors"
import { cn } from "@/lib/utils"

// AddToCartButton — Phase 8 8D. Shared CTA for ProductCard + PDP. Disabled
// when isInStock === false; otherwise dispatches useAddToCart and surfaces
// a Sonner toast on success or error.
//
// Per Phase 8 plan D3: NOT optimistic — wait for server response before
// updating cache. Server response carries the new line ID + price_snapshot
// + line_total which a local prediction can't match. The button shows a
// loading state during the request (~200-400ms typically) — feels
// snappier than fake-immediate-then-correct.
//
// Per OP-13 + plan D11: ApiError is caught here only to dispatch a
// localized toast. The mutation itself doesn't swallow errors —
// useAddToCart's underlying fetch throws as designed; this consumer
// translates the throw into UX, then re-throws is unnecessary because
// the caller (a button click handler) doesn't have a useful escalation
// path.

export interface AddToCartButtonProps {
  productId: string
  isInStock: boolean
  quantity?: number
  className?: string
}

export function AddToCartButton({
  productId,
  isInStock,
  quantity = 1,
  className,
}: AddToCartButtonProps) {
  const t = useTranslations()
  const addToCart = useAddToCart()
  const openDrawer = useCartUiStore((s) => s.openDrawer)

  const disabled = !isInStock || addToCart.isPending
  const label = !isInStock
    ? t("cart.out_of_stock")
    : addToCart.isPending
      ? t("cart.added")
      : t("product.add_to_cart")

  const handleClick = () => {
    addToCart.mutate(
      { productId, quantity },
      {
        onSuccess: () => {
          toast.success(t("cart.added"), {
            action: {
              label: t("cart.go_to_cart"),
              onClick: () => {
                // Desktop: open the drawer. Mobile users effectively get
                // the toast's auto-dismiss + tapping the cart icon to
                // navigate; opening the drawer here on mobile (where it
                // hides via md:hidden anyway) is harmless.
                openDrawer()
              },
            },
            duration: 4_000,
          })
        },
        onError: (error) => {
          const code = error instanceof ApiError ? error.code : "generic"
          // Resolve via the error.<code> family with a generic fallback.
          // Phase 5 / 6 / 7 added the most common cart error codes.
          const message = (() => {
            try {
              return t(`error.${code}`)
            } catch {
              return t("error.generic")
            }
          })()
          toast.error(message, { duration: 5_000 })
        },
      },
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={disabled}
      data-slot="add-to-cart-button"
      className={cn(
        "text-body-sm inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 font-medium",
        "bg-brand-500 text-white",
        "hover:bg-brand-600",
        "disabled:bg-ink-200 disabled:text-ink-500 disabled:cursor-not-allowed",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
    >
      {addToCart.isPending ? (
        <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <ShoppingCartIcon aria-hidden="true" className="size-4" />
      )}
      {label}
    </button>
  )
}
