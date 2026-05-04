import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { LegalPlaceholderShell } from "@/components/legal/LegalPlaceholderShell"
import { locales } from "@/i18n/config"
import { getSiteUrl } from "@/lib/seo/site-url"

interface TermsPageProps {
  params: Promise<{ locale: string }>
}

// Phase 12A — Terms of service shell. Real legal text lands per LAUNCH_
// CHECKLIST.md > Content gate before public launch. `noindex` prevents
// Google from caching the placeholder copy; flip to `index: true` when
// real text lands and add the route to the sitemap (currently excluded
// since placeholder content has no SEO value).

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  const siteUrl = getSiteUrl()
  return {
    title: t("legal.terms.title"),
    robots: { index: false, follow: false },
    alternates: {
      canonical: `${siteUrl}/${locale}/legal/terms`,
      languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}/legal/terms`])),
    },
  }
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return <LegalPlaceholderShell title={t("legal.terms.title")} />
}
