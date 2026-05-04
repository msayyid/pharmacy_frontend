import * as React from "react"

import { cn } from "@/lib/utils"

// Centralized rendering for order numbers. Sacred-invariant #5
// (CLAUDE.md): order numbers are ALWAYS in `--text-mono` with the
// `PH-` prefix. The backend already includes the prefix in
// `order_number` (e.g. "PH-2025-12345") — this component just
// guarantees the typeface.
//
// Inline `style={{ fontFamily: "var(--font-mono, ui-monospace)" }}`
// because the design tokens expose `--font-mono` as a CSS variable,
// not a Tailwind `fontFamily` map entry (Phase 11 polish). Until then,
// the inline fallback to `ui-monospace` is the safety net.

const SIZE_CLASS: Record<NonNullable<OrderNumberProps["size"]>, string> = {
  sm: "text-caption",
  md: "text-body-sm",
  lg: "text-body",
}

interface OrderNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string
  size?: "sm" | "md" | "lg"
}

export function OrderNumber({ value, size = "md", className, ...rest }: OrderNumberProps) {
  return (
    <span
      data-slot="order-number"
      className={cn("text-ink-900 font-mono", SIZE_CLASS[size], className)}
      style={{ fontFamily: "var(--font-mono, ui-monospace)" }}
      {...rest}
    >
      {value}
    </span>
  )
}
