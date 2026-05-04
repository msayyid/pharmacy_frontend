import { SearchIcon, ShoppingCartIcon, UserIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { cookies } from "next/headers"

import { LangSwitcher } from "@/components/i18n/LangSwitcher"
import { MobileMenu } from "@/components/layout/MobileMenu"
import { SearchInput } from "@/components/search/SearchInput"
import { BRAND } from "@/lib/brand"
import { cn } from "@/lib/utils"

// Storefront header — RSC. DESIGN §12.1 (mobile, h-14) and §12.2 (desktop,
// h-18). Sticky top, surface-card with a thin border. We deliberately skip
// the dynamic-on-scroll shadow (DESIGN §12.1 says elev-1 when scrolled past
// 0) at Phase 6 to avoid spinning up a scroll listener for chrome alone;
// always-visible thin border ships instead. Logged in DECISION_LOG.
//
// R-E (Header RSC + client island composition) — only <MobileMenu /> is a
// client component. Account icon, cart icon, and the desktop-only search
// stub are static <Link>s. The auth-aware account link reads the refresh
// cookie server-side via next/headers cookies() so we render the right
// destination without client hydration.

export interface HeaderProps {
  locale: string
}

export async function Header({ locale }: HeaderProps) {
  const t = await getTranslations()
  const isAuthed = (await cookies()).has("nookat_refresh")
  const accountHref = isAuthed
    ? `/${locale}/account`
    : `/${locale}/auth/otp?return=${encodeURIComponent(`/${locale}/account`)}`

  const desktopNavLinks: Array<{ href: string; label: string }> = [
    { href: `/${locale}/categories`, label: t("nav.categories") },
    { href: `/${locale}/symptoms`, label: t("nav.symptoms") },
    { href: `/${locale}/about`, label: t("nav.about") },
  ]

  return (
    <header
      className={cn(
        "border-ink-100 bg-surface-card sticky top-0 z-40 w-full border-b",
        "h-14 md:h-18",
      )}
    >
      <div className="mx-auto flex h-full max-w-screen-xl items-center gap-3 px-4 md:gap-6 md:px-6">
        <div className="md:hidden">
          <MobileMenu locale={locale} menuLabel={t("nav.menu")} closeLabel={t("nav.close")} />
        </div>

        <Link
          href={`/${locale}`}
          aria-label={t("nav.home")}
          className={cn(
            "flex items-center gap-2 rounded-md px-1 py-1",
            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          )}
        >
          <span className="text-h3 text-ink-900 font-semibold tracking-tight">
            {BRAND.nameLocalized[locale as keyof typeof BRAND.nameLocalized] ?? BRAND.name}
          </span>
        </Link>

        <nav aria-label={t("nav.menu")} className="hidden items-center gap-5 md:flex">
          {desktopNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-body-sm text-ink-700 rounded-md px-1 py-2",
                "hover:text-ink-900",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <Link
            href={`/${locale}/search`}
            aria-label={t("nav.search")}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-md md:hidden",
              "text-ink-700 hover:bg-ink-50",
              "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
            )}
          >
            <SearchIcon aria-hidden="true" className="size-5" />
          </Link>

          {/* Phase 7 7E: real SearchInput on desktop with debounced suggest
           *  dropdown. Mobile keeps the icon-link-to-/search above for
           *  the full-screen overlay (Phase 11+ enhancement). */}
          <div className="hidden md:block md:w-80">
            <SearchInput locale={locale} />
          </div>

          <div className="hidden md:flex">
            <LangSwitcher />
          </div>

          <Link
            href={accountHref}
            aria-label={t("nav.account")}
            className={cn(
              "hidden h-11 w-11 items-center justify-center rounded-md md:inline-flex",
              "text-ink-700 hover:bg-ink-50",
              "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
            )}
          >
            <UserIcon aria-hidden="true" className="size-5" />
          </Link>

          <Link
            href={`/${locale}/cart`}
            aria-label={t("nav.cart")}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-md",
              "text-ink-700 hover:bg-ink-50",
              "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
            )}
          >
            <ShoppingCartIcon aria-hidden="true" className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
