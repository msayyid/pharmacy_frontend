import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import * as React from "react"

// Phase 11B noindex layout. Hard-gated transactional surface — robots.txt
// already disallows /<locale>/cart, but we belt-and-suspenders here so
// well-behaved crawlers also see meta robots=noindex,nofollow. Server
// component so Next can read its `metadata` export; the page itself stays
// a Client Component below.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return {
    title: t("seo.cart.title"),
    robots: { index: false, follow: false },
  }
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
