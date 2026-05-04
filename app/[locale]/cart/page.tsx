import { ShoppingCartIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/feedback/EmptyState"

// Phase 6 placeholder. Phase 8 replaces the body with the real cart UI.
// Per the Phase 6 plan R-C: render a friendly empty-state, not a 404 — the
// header's cart icon links here from every page, so a click during the
// Phase 6 → Phase 8 window must land on something deliberate. DESIGN §14.1
// shape: title + body + CTA back to a useful surface.

interface CartPageProps {
  params: Promise<{ locale: string }>
}

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params
  const t = await getTranslations()

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-6 py-16">
      <EmptyState
        icon={ShoppingCartIcon}
        title={t("cart.empty.title")}
        cta={
          <Button asChild>
            <Link href={`/${locale}/categories`}>{t("cart.empty.cta")}</Link>
          </Button>
        }
      />
    </main>
  )
}
