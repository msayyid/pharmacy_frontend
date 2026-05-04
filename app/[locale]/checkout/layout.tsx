import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import * as React from "react"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return {
    title: t("seo.checkout.title"),
    robots: { index: false, follow: false },
  }
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
