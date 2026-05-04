import type { Metadata } from "next"
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google"
import { hasLocale } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

import { AppProviders } from "@/app/providers"
import { CartDrawer } from "@/components/cart/CartDrawer"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { WebVitalsReporter } from "@/components/observability/WebVitalsReporter"
import type { Locale } from "@/i18n/config"
import { BRAND, type BrandLocale } from "@/lib/brand"
import { locales } from "@/i18n/config"
import { buildPageTitle } from "@/lib/seo/title"
import { getSiteUrl } from "@/lib/seo/site-url"
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

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

// Phase 11B — locale-aware layout metadata. The Phase 4 placeholder
// ("foundation phase") is retired. Template title pattern (`%s | Ноокат`)
// applies to every child route via Next's metadata composition: routes
// that set metadata.title with `{ template, default }` win at the page
// level; otherwise children inherit the home defaults.
//
// `metadataBase` makes Open Graph URLs absolute under the canonical site
// origin without each child route having to repeat the host.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(locales, locale)) return { title: BRAND.name }
  const t = await getTranslations({ locale })
  const localeKey = locale as BrandLocale
  const localizedBrand = BRAND.nameLocalized[localeKey] ?? BRAND.name
  const siteUrl = getSiteUrl()

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: buildPageTitle({ prefix: t("seo.home.title"), brand: localizedBrand }),
      template: `%s | ${localizedBrand}`,
    },
    description: t("seo.home.description"),
    applicationName: localizedBrand,
    openGraph: {
      type: "website",
      siteName: localizedBrand,
      locale: locale === "ky" ? "ky_KG" : locale === "en" ? "en_US" : "ru_RU",
      url: `${siteUrl}/${locale}`,
      title: buildPageTitle({ prefix: t("seo.home.title"), brand: localizedBrand }),
      description: t("seo.home.description"),
    },
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: {
        ru: `${siteUrl}/ru`,
        ky: `${siteUrl}/ky`,
        en: `${siteUrl}/en`,
      },
    },
    robots: { index: true, follow: true },
  }
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
          {/* Phase 11D: Web Vitals → Sentry breadcrumb stream. No-op
           *  without SENTRY_DSN configured. */}
          <WebVitalsReporter />
        </AppProviders>
      </body>
    </html>
  )
}
