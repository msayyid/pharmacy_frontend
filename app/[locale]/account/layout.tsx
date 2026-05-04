import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import * as React from "react"

// Covers /account (profile) and /account/addresses. Both noindex.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return {
    title: t("seo.account.title"),
    robots: { index: false, follow: false },
  }
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
