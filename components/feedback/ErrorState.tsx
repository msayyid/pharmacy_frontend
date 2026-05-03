import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

// DESIGN §14.3 — ErrorState (block-level)
// Block-level error surface (a section failed to load). Visual:
//   icon in --color-ink-300 (NOT red — block errors are not crisis)
//   title "Не удалось загрузить" / locale equivalent
//   body  "Проверьте подключение и попробуйте снова"
//   retry button (typically `<Button variant="outline">`)
//   optional `code` (e.g. "out_of_stock", "network") rendered in mono for
//   debug-friendliness; production may hide this behind a dev flag in Phase 11.
//
// All copy comes from the consumer via i18n (Phase 4+). The `code` prop is
// raw — it's a stable machine-readable identifier from the API, not a string
// to translate.

export interface ErrorStateProps {
  icon?: LucideIcon
  title: string
  body?: string
  code?: string
  cta?: ReactNode
  className?: string
}

export function ErrorState({ icon: Icon, title, body, code, cta, className }: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="text-ink-300 size-8" aria-hidden="true" /> : null}
      <h3 className="text-h3 text-ink-800 font-semibold">{title}</h3>
      {body ? <p className="text-body text-ink-600 max-w-md">{body}</p> : null}
      {code ? (
        <p className="text-caption text-ink-400 font-mono" aria-label={`error code ${code}`}>
          [{code}]
        </p>
      ) : null}
      {cta ? <div className="mt-2">{cta}</div> : null}
    </div>
  )
}
