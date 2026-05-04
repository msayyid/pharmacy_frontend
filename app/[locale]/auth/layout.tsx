import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import * as React from "react"

// Covers /auth/otp (and any future auth segment). Noindex — the OTP page
// is per-session-state, never useful in search results.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return {
    title: t("seo.auth.otp.title"),
    robots: { index: false, follow: false },
  }
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
