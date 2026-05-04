"use client"

import { ShoppingCartIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api/errors"
import type { OrderRead } from "@/lib/api/types"
import { classifyReorder, useReorder } from "@/lib/orders/mutations"

// ReorderButton — Phase 10E. Calls POST /me/orders/{n}/reorder, then
// (on success) navigates to /cart with a partial-success-aware toast.
//
// **Order matters** (Phase 8 D12 R-C echo): the useReorder hook
// invalidates cartQueryKey BEFORE this component routes to /cart, so
// the destination renders the merged cart immediately on first paint.
//
// Toast outcomes (per classifyReorder):
//   full     → "All items added to your cart" success toast
//   partial  → "{added} of {total} items added; the rest unavailable"
//              info toast (Sonner's default tone)
//   empty    → "None available; explore alternatives" warning tone
//
// Errors propagate per OP-13 — we surface t(`error.${code}`) toast and
// stay on the current page.

interface ReorderButtonProps {
  order: OrderRead
  locale: string
}

export function ReorderButton({ order, locale }: ReorderButtonProps) {
  const t = useTranslations()
  const router = useRouter()
  const reorder = useReorder()

  const handleClick = () => {
    reorder.mutate(
      { orderNumber: order.order_number },
      {
        onSuccess: (response) => {
          const { outcome, added, total } = classifyReorder(response)
          if (outcome === "full") {
            toast.success(t("order.reorder.success.full"))
          } else if (outcome === "partial") {
            toast.message(t("order.reorder.success.partial", { added, total }))
          } else {
            // empty — warning tone via toast.warning if available;
            // sonner exposes warning() but with a distinct visual.
            toast.warning(t("order.reorder.success.empty"))
          }
          router.push(`/${locale}/cart`)
        },
        onError: (err) => {
          const code = err instanceof ApiError ? err.code : "generic"
          toast.error(t(`error.${code}`))
        },
      },
    )
  }

  return (
    <Button
      type="button"
      variant="default"
      onClick={handleClick}
      disabled={reorder.isPending}
      data-slot="reorder-cta"
    >
      <ShoppingCartIcon className="size-4" aria-hidden="true" />
      {reorder.isPending ? t("order.reorder.in_flight") : t("order.reorder.cta")}
    </Button>
  )
}
