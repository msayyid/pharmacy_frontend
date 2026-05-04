import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { LegalPlaceholderShell } from "@/components/legal/LegalPlaceholderShell"
import { locales } from "@/i18n/config"
import { getSiteUrl } from "@/lib/seo/site-url"

interface DeliveryPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: DeliveryPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  const siteUrl = getSiteUrl()
  return {
    title: t("legal.delivery.title"),
    robots: { index: false, follow: false },
    alternates: {
      canonical: `${siteUrl}/${locale}/legal/delivery`,
      languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}/legal/delivery`])),
    },
  }
}

export default async function DeliveryPage({ params }: DeliveryPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return <LegalPlaceholderShell title={t("legal.delivery.title")} />
}
