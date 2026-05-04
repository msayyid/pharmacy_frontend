import { TruckIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { cn } from "@/lib/utils"

// DeliveryBadge — DESIGN §11.3 + §15.3. Calm green pill with truck icon +
// localized copy. Phase 7: static "same-day delivery in Bishkek" copy
// because StorefrontProductDetail doesn't expose a per-product delivery
// estimate field. Per-branch / per-zone computation lands when admin
// Phase A1+ wires the data + backend exposes the derived value.
//
// Sacred invariant honored: no "guaranteed" or "fastest" claims, no
// time-pressured countdown. Just factual capability.

export interface DeliveryBadgeProps {
  className?: string
}

export async function DeliveryBadge({ className }: DeliveryBadgeProps) {
  const t = await getTranslations()

  return (
    <span
      data-slot="delivery-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
        "bg-success-50 text-success-700",
        "text-body-sm font-medium",
        className,
      )}
    >
      <TruckIcon aria-hidden="true" className="size-4" />
      {t("product.delivery_today")}
    </span>
  )
}
