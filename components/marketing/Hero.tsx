import { ArrowRightIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

import { cn } from "@/lib/utils"

// Type-led hero per DESIGN §8.2 Pattern A. No image, no carousel — large
// serif/sans tagline + supporting line + a single primary CTA. Phase 6
// CTA → /[locale]/categories (decided in plan Q1: a working link beats an
// aspirational one; Phase 7 retargets to /search).

export interface HeroProps {
  locale: string
}

export async function Hero({ locale }: HeroProps) {
  const t = await getTranslations()

  return (
    <section
      data-slot="hero"
      className={cn(
        "mx-auto flex max-w-screen-xl flex-col items-start gap-6 px-4 py-12 md:px-6 md:py-20",
      )}
    >
      <h1 className="text-display text-ink-900 font-semibold tracking-tight">
        {t("home.hero.title")}
      </h1>
      <p className="text-body text-ink-700 md:text-body-lg max-w-2xl">{t("home.hero.subtitle")}</p>
      {/* Phase 7 7C: retargeted from /categories → /search per Phase 6 plan
       *  Q1 deferred decision (D1). Search route lands in 7D; the link
       *  resolves to a working route by phase close. */}
      <Link
        href={`/${locale}/search`}
        className={cn(
          "bg-brand-500 inline-flex items-center gap-2 rounded-md px-5 py-3",
          "text-body-sm font-medium text-white",
          "hover:bg-brand-600",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        {t("home.hero.cta")}
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </section>
  )
}
