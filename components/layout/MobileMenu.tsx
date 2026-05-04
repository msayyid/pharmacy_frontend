"use client"

import { MenuIcon, PhoneIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import * as React from "react"

import { LangSwitcher } from "@/components/i18n/LangSwitcher"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { BRAND } from "@/lib/brand"
import { cn } from "@/lib/utils"

// Mobile drawer for the storefront header. Per DESIGN §12.1 the mobile
// header has hamburger + brand mark + search icon + cart icon; tapping the
// hamburger opens this Sheet from the left with full nav.
//
// This file is the Phase 6 client island. The parent <Header /> stays an
// RSC; only the Sheet's open state forces "use client" here. Keeping the
// surface this small means the homepage's client JS payload doesn't pull
// the entire Header into the bundle (R-E from the Phase 6 plan).

export interface MobileMenuProps {
  locale: string
  /** Already-resolved label for the trigger's aria-label and visible
   *  fallback. We accept this as a prop so the trigger doesn't need
   *  useTranslations() and the SSR shell doesn't have to wait for client
   *  i18n hydration before rendering the icon button. */
  menuLabel: string
  closeLabel: string
}

export function MobileMenu({ locale, menuLabel, closeLabel }: MobileMenuProps) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)

  const links: Array<{ href: string; label: string }> = [
    { href: `/${locale}`, label: t("nav.home") },
    { href: `/${locale}/categories`, label: t("nav.categories") },
    { href: `/${locale}/symptoms`, label: t("nav.symptoms") },
    { href: `/${locale}/about`, label: t("nav.about") },
    { href: `/${locale}/account`, label: t("nav.account") },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={menuLabel}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-md",
            "text-ink-700 hover:bg-ink-50",
            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          )}
        >
          <MenuIcon aria-hidden="true" className="size-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-80 flex-col gap-0 p-0">
        <SheetHeader className="border-ink-100 border-b px-6 py-4">
          <SheetTitle className="text-h3 text-ink-900 font-semibold">
            {BRAND.nameLocalized[locale as keyof typeof BRAND.nameLocalized] ?? BRAND.name}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col px-2 py-4" aria-label={menuLabel}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "text-body text-ink-800 rounded-md px-4 py-3",
                "hover:bg-ink-50",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="border-ink-100 mt-auto flex flex-col gap-3 border-t px-6 py-4">
          <a
            href={`tel:${BRAND.supportPhone.replace(/\s+/g, "")}`}
            className="text-body-sm text-ink-700 hover:text-brand-600 inline-flex items-center gap-2"
          >
            <PhoneIcon aria-hidden="true" className="size-4" />
            {BRAND.supportPhone}
          </a>
          <LangSwitcher />
          <span className="sr-only">{closeLabel}</span>
        </div>
      </SheetContent>
    </Sheet>
  )
}
