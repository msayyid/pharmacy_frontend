import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { LegalPlaceholderShell } from "@/components/legal/LegalPlaceholderShell"
import { locales } from "@/i18n/config"
import { getSiteUrl } from "@/lib/seo/site-url"

interface ReturnsPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ReturnsPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  const siteUrl = getSiteUrl()
  return {
    title: t("legal.returns.title"),
    robots: { index: false, follow: false },
    alternates: {
      canonical: `${siteUrl}/${locale}/legal/returns`,
      languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}/legal/returns`])),
    },
  }
}

export default async function ReturnsPage({ params }: ReturnsPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return <LegalPlaceholderShell title={t("legal.returns.title")} />
}
