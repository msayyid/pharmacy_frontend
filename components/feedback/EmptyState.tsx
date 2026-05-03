import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

// DESIGN §14.1 — EmptyState
// Standardized empty-state surface used in 20+ places (empty cart, no orders,
// no saved addresses, search no-results, etc.). Visual:
//   icon (24-32px) in --color-ink-300
//   title in --text-h3 / --color-ink-800
//   body  in --text-body / --color-ink-600
//   optional CTA (typically a primary <Button>)
//
// `title` is required; `body`, `icon`, and `cta` are optional. Strings come
// from the consumer (i18n in Phase 4+) — never hardcoded here.

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  body?: string
  cta?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, body, cta, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="text-ink-300 size-8" aria-hidden="true" /> : null}
      <h3 className="text-h3 text-ink-800 font-semibold">{title}</h3>
      {body ? <p className="text-body text-ink-600 max-w-md">{body}</p> : null}
      {cta ? <div className="mt-2">{cta}</div> : null}
    </div>
  )
}
