import type { Metadata } from "next"
import { ClockIcon, MapPinIcon, PhoneIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { EmptyState } from "@/components/feedback/EmptyState"
import { TrustStrip } from "@/components/marketing/TrustStrip"
import { locales } from "@/i18n/config"
import { getBranches } from "@/lib/api/catalog"
import { BRAND, type BrandLocale } from "@/lib/brand"
import { formatPhoneDisplay } from "@/lib/format/phone"
import { getSiteUrl } from "@/lib/seo/site-url"
import { cn } from "@/lib/utils"

// About page (/[locale]/about) — RSC. DESIGN §12.3 trust-led + §11.3
// pillars. Renders the single Nookat branch (Q-1 — backend hardcodes
// branch_id=1; the seed has 2 branches but they're both Bishkek
// satellite locations; the brand identity stays "Nookat in Nookat").
// Branches list is from /api/v1/branches; falls back to a friendly
// EmptyState when the list is empty.

interface AboutPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  const siteUrl = getSiteUrl()
  return {
    title: t("seo.about.title"),
    description: t("seo.about.description"),
    alternates: {
      canonical: `${siteUrl}/${locale}/about`,
      languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}/about`])),
    },
  }
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params
  const t = await getTranslations()
  const branches = await getBranches(locale)
  const localeKey: BrandLocale = (
    ["ru", "ky", "en"].includes(locale) ? locale : "ru"
  ) as BrandLocale

  return (
    <div className="flex flex-col">
      <section className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 text-ink-900 font-semibold">{t("branch.page_title")}</h1>
          <p className="text-body text-ink-700 max-w-2xl">{t("brand.about")}</p>
          <p className="text-body-sm text-ink-500">{BRAND.tagline[localeKey]}</p>
        </header>

        {branches.length === 0 ? (
          <EmptyState title={t("error.network")} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {branches.map((branch) => (
              <li key={branch.id}>
                <article
                  className={cn(
                    "border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-5",
                  )}
                >
                  <h2 className="text-h3 text-ink-900 font-semibold">{branch.name}</h2>
                  <dl className="text-body-sm text-ink-700 flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <MapPinIcon
                        aria-hidden="true"
                        className="text-ink-500 mt-0.5 size-4 flex-none"
                      />
                      <div>
                        <dt className="sr-only">{t("branch.address")}</dt>
                        <dd>
                          {branch.address}
                          {branch.city ? `, ${branch.city}` : ""}
                        </dd>
                      </div>
                    </div>
                    {branch.phone ? (
                      <div className="flex items-start gap-2">
                        <PhoneIcon
                          aria-hidden="true"
                          className="text-ink-500 mt-0.5 size-4 flex-none"
                        />
                        <div>
                          <dt className="sr-only">{t("branch.phone")}</dt>
                          <dd>
                            <a
                              href={`tel:${branch.phone.replace(/\s+/g, "")}`}
                              className="hover:text-brand-600"
                            >
                              {formatPhoneDisplay(branch.phone)}
                            </a>
                          </dd>
                        </div>
                      </div>
                    ) : null}
                    {branch.opens_at && branch.closes_at ? (
                      <div className="flex items-start gap-2">
                        <ClockIcon
                          aria-hidden="true"
                          className="text-ink-500 mt-0.5 size-4 flex-none"
                        />
                        <div>
                          <dt className="sr-only">{t("branch.hours")}</dt>
                          <dd>
                            {branch.opens_at}–{branch.closes_at}
                          </dd>
                        </div>
                      </div>
                    ) : null}
                  </dl>
                </article>
              </li>
            ))}
          </ul>
        )}

        <p className="text-body-sm text-ink-500">
          {t("footer.license_label", { number: BRAND.licenseNumber })}
        </p>
      </section>

      <TrustStrip locale={locale} />
    </div>
  )
}
