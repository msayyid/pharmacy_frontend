import type { Metadata } from "next"
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google"
import { hasLocale } from "next-intl"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"

import { AppProviders } from "@/app/providers"
import { CartDrawer } from "@/components/cart/CartDrawer"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import type { Locale } from "@/i18n/config"
import { BRAND } from "@/lib/brand"
import { locales } from "@/i18n/config"
import "../globals.css"

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: `${BRAND.name} — foundation phase`,
  description: `${BRAND.name} storefront foundation phase. See BUILD_PROGRESS.md for the active phase.`,
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

// Per Phase 4 D6: this is the de-facto root layout. There is no
// `app/layout.tsx` — `app/[locale]/layout.tsx` provides `<html lang>` and
// `<body>` directly. All rendered routes live under `[locale]`. Route
// handlers (`/api/*`) are layout-free by Next.js convention.
//
// Phase 5 (D10): wraps children with <AppProviders> so client components
// have access to TanStack Query, next-intl, and Radix Tooltip context.
// The provider lives in app/providers.tsx ("use client") and is mounted
// here from this Server Component.
//
// Phase 6 (6A): mounts <Header /> + <Footer /> as RSC siblings of the
// route content. Both components render server-side; only the mobile menu
// trigger inside Header is a client island (R-E mitigation). The body
// becomes a flex column so the footer hugs the bottom on short pages.
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params
  if (!hasLocale(locales, locale)) notFound()

  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable} ${dmSerif.variable}`}
    >
      <body className="bg-surface-app text-ink-900 flex min-h-screen flex-col antialiased">
        <AppProviders locale={locale} messages={messages}>
          <Header locale={locale} />
          <main className="flex-1">{children}</main>
          <Footer locale={locale} />
          {/* Phase 8 8C: globally-mounted drawer so the Header's desktop
           *  cart-icon button can trigger it on any route. */}
          <CartDrawer locale={locale as Locale} />
        </AppProviders>
      </body>
    </html>
  )
}
