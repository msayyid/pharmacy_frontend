import { ClockIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { BRAND, type BrandLocale } from "@/lib/brand"
import { cn } from "@/lib/utils"

// "Why Nookat" trust strip — DESIGN §11.3 + §15.4. Calm, factual copy only;
// no marketing scarcity, no fake "100% authentic" claims (sacred invariant
// CLAUDE.md). Three pillars: real pharmacy in Nookat, licensed, same-day
// delivery in Bishkek.

export interface TrustStripProps {
  locale: string
}

interface Pillar {
  icon: typeof ShieldCheckIcon
  titleKey: string
  body: string
}

export async function TrustStrip({ locale }: TrustStripProps) {
  const t = await getTranslations()
  const localeKey: BrandLocale = (
    ["ru", "ky", "en"].includes(locale) ? locale : "ru"
  ) as BrandLocale

  // Each pillar's title comes from the i18n key system; the body uses the
  // BRAND constants so we don't duplicate the address / license number /
  // tagline in three places.
  const pillars: Pillar[] = [
    {
      icon: MapPinIcon,
      titleKey: "branch.page_title",
      body: BRAND.address[localeKey],
    },
    {
      icon: ShieldCheckIcon,
      titleKey: "branch.license",
      body: BRAND.licenseNumber,
    },
    {
      icon: ClockIcon,
      titleKey: "checkout.totals.delivery",
      body: BRAND.tagline[localeKey],
    },
  ]

  return (
    <section
      data-slot="trust-strip"
      aria-labelledby="trust-strip-heading"
      className={cn("mx-auto max-w-screen-xl px-4 py-12 md:px-6 md:py-16")}
    >
      <h2 id="trust-strip-heading" className="text-h2 text-ink-900 mb-8 font-semibold">
        {t("home.section.why")}
      </h2>
      <ul className="grid gap-6 md:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon
          return (
            <li
              key={pillar.titleKey}
              className={cn(
                "border-ink-100 bg-surface-card flex flex-col gap-2 rounded-lg border p-5",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-md",
                  "bg-brand-50 text-brand-600",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="text-body text-ink-900 font-semibold">{t(pillar.titleKey)}</h3>
              <p className="text-body-sm text-ink-700">{pillar.body}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
