"use client"

import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

// Status pip — calm pill that maps an order status to a tone bucket.
// DESIGN §13.x; sacred-invariant #1 (no marketing scarcity, no fake
// urgency — the pip only labels state, doesn't push).
//
// Tone buckets (per Phase 10 plan B):
//   pending | confirmed | preparing            → neutral (ink)
//   ready_for_pickup | out_for_delivery        → info (brand-blue tone)
//   delivered                                  → success (green)
//   cancelled | refunded                       → muted-red (ink-red, not crisis)
//
// `t("order.status.${status}")` resolves the localized label. Unknown
// statuses fall back to the raw status string and a neutral tone so
// a future backend state doesn't crash the UI.

type Tone = "neutral" | "info" | "success" | "muted"

const TONE_BY_STATUS: Record<string, Tone> = {
  pending: "neutral",
  confirmed: "neutral",
  preparing: "neutral",
  ready_for_pickup: "info",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "muted",
  refunded: "muted",
}

const KNOWN_STATUSES = new Set(Object.keys(TONE_BY_STATUS))

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-ink-50 text-ink-700 border-ink-200",
  info: "bg-brand-50 text-brand-700 border-brand-200",
  success: "bg-success-50 text-success-700 border-success-200",
  muted: "bg-ink-50 text-ink-500 border-ink-200",
}

export interface StatusPipProps {
  status: string
  className?: string
}

export function StatusPip({ status, className }: StatusPipProps) {
  const t = useTranslations()
  const tone = TONE_BY_STATUS[status] ?? "neutral"
  // Defensive for unknown future backend states: only resolve via i18n
  // when the status is in our known set, else surface the raw value
  // (better than rendering "order.status.<unknown>" — the key path leak
  // from next-intl's missing-translation fallback).
  const label = KNOWN_STATUSES.has(status) ? t(`order.status.${status}`) : status

  return (
    <span
      data-slot="status-pip"
      data-status={status}
      className={cn(
        "text-caption inline-flex items-center rounded-full border px-2 py-0.5 font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  )
}
