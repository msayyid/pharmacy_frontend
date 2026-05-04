import { CompassIcon, PhoneIcon } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/feedback/EmptyState"
import { BRAND } from "@/lib/brand"

// Per-locale 404 page. Phase 11C.
//
// Triggered by `notFound()` calls (PDP unknown slug, category unknown
// slug, symptom unknown slug) and by direct hits to non-existent routes.
// Calm copy + CTA back to the catalog + the support phone (sacred-
// invariant #4).
//
// Server component — uses next-intl's RSC `getTranslations` so it
// renders without client JS. The locale is read from `getLocale()`
// (next-intl wires the request-level locale automatically).

export default async function NotFoundPage() {
  const t = await getTranslations()
  const locale = await getLocale()

  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-4 px-4 py-12 md:px-6 md:py-16">
      <EmptyState
        icon={CompassIcon}
        title={t("seo.not_found.title")}
        body={t("seo.not_found.body")}
        cta={
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href={`/${locale}/categories`}>{t("seo.not_found.cta")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={`tel:${BRAND.supportPhone.replace(/\s+/g, "")}`}>
                <PhoneIcon aria-hidden="true" className="size-4" />
                {BRAND.supportPhone}
              </a>
            </Button>
          </div>
        }
      />
    </main>
  )
}
