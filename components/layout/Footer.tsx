import { MapPinIcon, PhoneIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

import { LangSwitcher } from "@/components/i18n/LangSwitcher"
import { BRAND, type BrandLocale } from "@/lib/brand"
import { cn } from "@/lib/utils"

// Storefront footer — RSC. DESIGN §12.3: three-column desktop, stacked
// mobile. Column 1 brand info + address + support phone; column 2 customer
// support; column 3 legal. Bottom strip: lang switcher + copyright +
// license number.

export interface FooterProps {
  locale: string
}

export async function Footer({ locale }: FooterProps) {
  const t = await getTranslations()
  const localeKey: BrandLocale = (
    ["ru", "ky", "en"].includes(locale) ? locale : "ru"
  ) as BrandLocale
  const year = new Date().getFullYear()

  const legalLinks: Array<{ href: string; label: string }> = [
    { href: `/${locale}/legal/terms`, label: t("footer.legal_terms") },
    { href: `/${locale}/legal/privacy`, label: t("footer.legal_privacy") },
    { href: `/${locale}/legal/delivery`, label: t("footer.legal_delivery") },
    { href: `/${locale}/legal/returns`, label: t("footer.legal_returns") },
  ]

  return (
    <footer
      className={cn(
        "border-ink-100 bg-surface-card mt-auto border-t",
        "px-4 py-10 md:px-6 md:py-12",
      )}
    >
      <div className="mx-auto grid max-w-screen-xl gap-8 md:grid-cols-3">
        <section className="flex flex-col gap-3">
          <h2 className="text-h3 text-ink-900 font-semibold">{BRAND.nameLocalized[localeKey]}</h2>
          <p className="text-body-sm text-ink-600">{BRAND.tagline[localeKey]}</p>
          <p className="text-body-sm text-ink-700 flex items-start gap-2">
            <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 flex-none" />
            <span>{BRAND.address[localeKey]}</span>
          </p>
          <a
            href={`tel:${BRAND.supportPhone.replace(/\s+/g, "")}`}
            className="text-body-sm text-ink-700 hover:text-brand-600 inline-flex items-center gap-2"
          >
            <PhoneIcon aria-hidden="true" className="size-4" />
            {BRAND.supportPhone}
          </a>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-body-sm text-ink-500 font-semibold tracking-wide uppercase">
            {t("nav.about")}
          </h2>
          <Link
            href={`/${locale}/about`}
            className="text-body-sm text-ink-700 hover:text-brand-600"
          >
            {t("branch.page_title")}
          </Link>
          <Link
            href={`/${locale}/categories`}
            className="text-body-sm text-ink-700 hover:text-brand-600"
          >
            {t("nav.categories")}
          </Link>
          <Link
            href={`/${locale}/symptoms`}
            className="text-body-sm text-ink-700 hover:text-brand-600"
          >
            {t("nav.symptoms")}
          </Link>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-body-sm text-ink-500 font-semibold tracking-wide uppercase">
            {t("footer.legal_terms")}
          </h2>
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-body-sm text-ink-700 hover:text-brand-600"
            >
              {link.label}
            </Link>
          ))}
        </section>
      </div>

      <div
        className={cn(
          "border-ink-100 mx-auto mt-10 flex max-w-screen-xl flex-col gap-3 border-t pt-6",
          "md:flex-row md:items-center md:justify-between",
        )}
      >
        <div className="text-caption text-ink-500 flex flex-col gap-1">
          <span>{t("footer.copyright", { year })}</span>
          <span>{t("footer.license_label", { number: BRAND.licenseNumber })}</span>
        </div>
        <LangSwitcher />
      </div>
    </footer>
  )
}
