import { AlertTriangleIcon, PhoneIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { BRAND } from "@/lib/brand"
import { cn } from "@/lib/utils"

// Phase 12A — shared shell for legal page placeholders.
//
// Per the Phase 12 prompt's DoD: "Legal pages exist (placeholder content
// acceptable for staging; real content gates production)." We ship the
// page structure now with a warning-tone banner explicitly flagging the
// content as TBD, plus a sacred-invariant #4 phone CTA so customers with
// urgent legal questions can call us.
//
// Each legal route (`/legal/terms`, `/legal/privacy`, `/legal/delivery`,
// `/legal/returns`) renders the same shell with a different title +
// optional body content. Real legal text lands per-route via a content
// swap before public launch — see `LAUNCH_CHECKLIST.md > Content`.

export interface LegalPlaceholderShellProps {
  title: string
  /** Optional sections of body copy that survive the placeholder phase
   *  (e.g., contact info, structural headings). Most pages omit this and
   *  render the banner + phone CTA only. */
  children?: React.ReactNode
}

export function LegalPlaceholderShell({ title, children }: LegalPlaceholderShellProps) {
  const t = useTranslations()
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-ink-900 font-semibold">{title}</h1>
        <p className="text-body-sm text-ink-500">{t("legal.last_updated_placeholder")}</p>
      </header>

      <aside
        role="note"
        aria-label={t("legal.placeholder_banner_label")}
        className={cn(
          "flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-start md:gap-4",
          "border-warning-200 bg-warning-50 text-warning-900",
        )}
      >
        <AlertTriangleIcon
          aria-hidden="true"
          className="text-warning-600 size-5 flex-none md:mt-0.5"
        />
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-body font-medium">{t("legal.placeholder_banner_title")}</p>
          <p className="text-body-sm">{t("legal.placeholder_banner_body")}</p>
          <div>
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${BRAND.supportPhone.replace(/\s+/g, "")}`}>
                <PhoneIcon aria-hidden="true" className="size-3.5" />
                {BRAND.supportPhone}
              </a>
            </Button>
          </div>
        </div>
      </aside>

      {children ? <div className="flex flex-col gap-4">{children}</div> : null}
    </main>
  )
}
