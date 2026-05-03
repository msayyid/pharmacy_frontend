import type { Metadata } from "next"
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { Tooltip as TooltipPrimitive } from "radix-ui"

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
// If Next 16 ever rejects this shape (requires `app/layout.tsx` to exist
// with `<html>+<body>`), the fallback is documented in the Phase 4 plan
// (R-A): keep `app/layout.tsx` with fixed `lang="ru"` and add a small
// client-side useEffect to update `document.documentElement.lang` on
// locale switch.
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params
  if (!hasLocale(locales, locale)) notFound()

  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable} ${dmSerif.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <TooltipPrimitive.Provider>{children}</TooltipPrimitive.Provider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
