import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import * as React from "react"

// Covers both /orders (index) and /orders/[orderNumber] (detail). Both
// surfaces are personal data and should never be crawled. The detail
// page stays Client (TanStack Query polling per Q-12) — its dynamic
// `title | Ноокат` is set via document title in-page if needed; for SEO
// purposes the noindex is what matters.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return {
    title: t("seo.orders.title"),
    robots: { index: false, follow: false },
  }
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
