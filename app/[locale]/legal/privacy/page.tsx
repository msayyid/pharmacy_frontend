import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { LegalPlaceholderShell } from "@/components/legal/LegalPlaceholderShell"
import { locales } from "@/i18n/config"
import { getSiteUrl } from "@/lib/seo/site-url"

interface PrivacyPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  const siteUrl = getSiteUrl()
  return {
    title: t("legal.privacy.title"),
    robots: { index: false, follow: false },
    alternates: {
      canonical: `${siteUrl}/${locale}/legal/privacy`,
      languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}/legal/privacy`])),
    },
  }
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return <LegalPlaceholderShell title={t("legal.privacy.title")} />
}
