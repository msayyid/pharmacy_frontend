"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"

import { type Locale, locales } from "@/i18n/config"
import { cn } from "@/lib/utils"

// DESIGN §18.4 — compact pill switcher used in the header (Phase 6 places
// it). Three buttons rendering "RU" / "KY" / "EN" upper-case. Active option
// is non-clickable and visually highlighted; aria-current="true" announces
// the current locale to assistive tech.
//
// The verbose footer version (full names «Русский» / «Кыргызча» / «English»)
// lands in Phase 6 alongside the Footer component.
//
// Path swap strategy: the URL prefix is the source of truth, so we strip
// the existing 2-letter prefix and prepend the new one. next-intl's
// middleware then sets the NEXT_LOCALE cookie automatically on the next
// navigation. Q-11 from MASTER_PLAN: cookie + URL prefix + Accept-Language
// stay aligned.

const LOCALE_LABEL: Record<Locale, string> = {
  ru: "RU",
  ky: "KY",
  en: "EN",
}

export interface LangSwitcherProps {
  className?: string
}

export function LangSwitcher({ className }: LangSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale() as Locale

  function switchTo(target: Locale): void {
    if (target === currentLocale) return
    // Strip the existing /<locale> prefix (always present per D1) and
    // prepend the new one. Path is otherwise preserved.
    const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/"
    const next = `/${target}${stripped === "/" ? "" : stripped}`
    router.replace(next)
  }

  return (
    <div
      data-slot="lang-switcher"
      role="group"
      aria-label="Language"
      className={cn(
        "rounded-pill border-ink-200 bg-surface-card inline-flex items-center gap-1 border p-0.5",
        className,
      )}
    >
      {locales.map((loc) => {
        const isActive = loc === currentLocale
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchTo(loc)}
            aria-current={isActive ? "true" : undefined}
            disabled={isActive}
            className={cn(
              "rounded-pill text-caption px-2.5 py-1 font-medium transition-colors",
              "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              isActive
                ? "bg-brand-500 text-primary-foreground cursor-default"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900 cursor-pointer",
            )}
          >
            {LOCALE_LABEL[loc]}
          </button>
        )
      })}
    </div>
  )
}
