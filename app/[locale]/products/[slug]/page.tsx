import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import * as React from "react"

import { ActiveIngredientChip } from "@/components/product/ActiveIngredientChip"
import { AddToCartButton } from "@/components/product/AddToCartButton"
import { DeliveryBadge } from "@/components/product/DeliveryBadge"
import { ImageCarousel } from "@/components/product/ImageCarousel"
import {
  ProductDescriptionTabs,
  type ProductDescriptionSection,
} from "@/components/product/ProductDescriptionTabs"
import { PriceTag } from "@/components/product/PriceTag"
import { StockPip } from "@/components/product/StockPip"
import {
  SubstitutesAsync,
  SubstitutesBlock,
  SubstitutesSkeleton,
} from "@/components/product/SubstitutesBlock"
import { type Locale, locales } from "@/i18n/config"
import { getProductDetail, getRelatedProducts } from "@/lib/api/catalog"
import type { ProductDetail } from "@/lib/api/types"
import { BRAND, type BrandLocale } from "@/lib/brand"
import { buildPageTitle } from "@/lib/seo/title"

// PDP — DESIGN §12.6. RSC. Phase 7 7B delivers the above-fold + below-fold
// panels (carousel, name + manufacturer + stock + price + disabled CTA,
// description tabs/accordion, ingredient chips). 7C wires the
// SubstitutesBlock with conditional Suspense (in-stock = below fold via
// Suspense; OOS = above fold via Promise.all per plan D6 / R-F).
//
// generateMetadata per Phase 7 prompt §7.4.6 + plan D12: title +
// description + OG image + hreflang alternates. Brand literal goes
// through buildPageTitle() so the route doesn't hardcode "Nookat".

interface PdpPageProps {
  params: Promise<{ locale: string; slug: string }>
}

const SECTION_KEYS: Array<{
  id: string
  field: keyof Pick<
    ProductDetail,
    "composition" | "description" | "usage_instructions" | "side_effects" | "contraindications"
  >
  labelKey: string
}> = [
  { id: "composition", field: "composition", labelKey: "product.composition" },
  { id: "indications", field: "description", labelKey: "product.indications" },
  { id: "usage", field: "usage_instructions", labelKey: "product.usage" },
  { id: "side_effects", field: "side_effects", labelKey: "product.side_effects" },
  {
    id: "contraindications",
    field: "contraindications",
    labelKey: "product.contraindications",
  },
]

export async function generateMetadata({ params }: PdpPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  if (!hasLocale(locales, locale)) return { title: BRAND.name }
  const product = await getProductDetail(slug, locale)
  if (!product) return { title: BRAND.name }

  const localeKey: BrandLocale = locale as BrandLocale
  const localizedBrand = BRAND.nameLocalized[localeKey] ?? BRAND.name
  const title = buildPageTitle({ prefix: product.name, brand: localizedBrand })
  const description = product.short_description ?? undefined
  const primaryImage = product.images.find((i) => i.is_primary) ?? product.images[0]

  return {
    title,
    ...(description ? { description } : {}),
    openGraph: {
      title: product.name,
      ...(description ? { description } : {}),
      ...(primaryImage ? { images: [{ url: primaryImage.large_url ?? primaryImage.url }] } : {}),
    },
    alternates: {
      languages: {
        ru: `/ru/products/${slug}`,
        ky: `/ky/products/${slug}`,
        en: `/en/products/${slug}`,
      },
    },
  }
}

export default async function PdpPage({ params }: PdpPageProps) {
  const { locale, slug } = await params
  if (!hasLocale(locales, locale)) notFound()
  const t = await getTranslations()

  const product = await getProductDetail(slug, locale)
  if (!product) notFound()

  // Plan R-F mitigation: in-stock PDPs stream the main content first and
  // suspend the substitutes fetch below the description tabs. OOS PDPs
  // promote alternatives above the fold (PRODUCT §F-CAT-007 + plan D6),
  // so we fetch related upfront in the same render path — no Suspense,
  // no layout shift after main content paints.
  const oosRelated = !product.is_in_stock ? await getRelatedProducts(slug, locale) : null

  const sections: ProductDescriptionSection[] = SECTION_KEYS.flatMap((entry) => {
    const value = product[entry.field]
    if (!value) return []
    return [{ id: entry.id, label: t(entry.labelKey), content: value }]
  })

  // Storage section — driven by requires_cold_chain flag rather than a
  // free-text field. We surface the cold-chain notice when the flag is set;
  // when not, the storage panel is omitted (PRODUCT spec doesn't mandate
  // generic storage copy on every product per plan D3 "omit empty fields").
  if (product.requires_cold_chain) {
    sections.push({
      id: "storage",
      label: t("product.storage"),
      content: t("product.requires_cold_chain"),
    })
  }

  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-10 px-4 py-8 md:px-6 md:py-12">
      <section className="grid gap-6 md:grid-cols-2 md:gap-10">
        <ImageCarousel images={product.images ?? []} alt={product.name} />

        <div className="flex flex-col gap-4">
          <header className="flex flex-col gap-2">
            <h1 className="text-h1 text-ink-900 font-semibold">{product.name}</h1>
            {product.short_description ? (
              <p className="text-body text-ink-600">{product.short_description}</p>
            ) : null}
            {product.manufacturer_name ? (
              <p className="text-body-sm text-ink-600">
                {t("product.manufacturer_label")}: {product.manufacturer_name}
                {product.manufacturer_country ? ` · ${product.manufacturer_country}` : ""}
              </p>
            ) : null}
          </header>

          <div className="flex flex-wrap items-center gap-3">
            <StockPip
              inStock={product.is_in_stock}
              label={product.is_in_stock ? t("product.delivery_today") : t("cart.out_of_stock")}
            />
            {product.is_in_stock ? <DeliveryBadge /> : null}
          </div>

          <PriceTag
            price={Number(product.price)}
            {...(product.compare_at_price !== null && product.compare_at_price !== undefined
              ? { compareAt: Number(product.compare_at_price) }
              : {})}
            locale={locale as Locale}
            className="text-h2"
          />

          {/* Phase 8 8D: PDP CTA wires to AddToCartButton. PDP-page-local
           *  quantity stepper is a Phase 11 polish — for MVP the PDP
           *  always adds quantity=1 and the customer adjusts qty in the
           *  cart drawer / page after add. */}
          <AddToCartButton
            productId={product.id}
            isInStock={product.is_in_stock}
            quantity={1}
            className="text-body px-5 py-3"
          />

          {product.requires_prescription ? (
            <p className="text-body-sm text-warning-700">{t("product.requires_prescription")}</p>
          ) : null}

          {product.active_ingredients.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-body-sm text-ink-500 font-semibold tracking-wide uppercase">
                {t("product.chip.ingredients_heading")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {product.active_ingredients.map((ingredient) => (
                  <li key={ingredient.id}>
                    <ActiveIngredientChip ingredient={ingredient} locale={locale} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* OOS path: promote substitutes above the fold (right after the
       *  disabled CTA section). Customer with active intent sees "here's
       *  what works the same" before scrolling past. Plan D6 + R-F. */}
      {oosRelated ? (
        <SubstitutesBlock
          products={oosRelated}
          locale={locale as Locale}
          heading={t("product.alternatives.heading_oos")}
        />
      ) : null}

      {sections.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="pdp-details-heading">
          <h2 id="pdp-details-heading" className="text-h2 text-ink-900 font-semibold">
            {t("product.details_heading")}
          </h2>
          <ProductDescriptionTabs sections={sections} />
        </section>
      ) : null}

      {/* In-stock path: substitutes stream below the description tabs via
       *  Suspense, so the main PDP paints immediately and the related
       *  fetch resolves in the background. */}
      {product.is_in_stock ? (
        <React.Suspense fallback={<SubstitutesSkeleton />}>
          <SubstitutesAsync
            slug={slug}
            locale={locale as Locale}
            heading={t("product.same_ingredient.heading")}
          />
        </React.Suspense>
      ) : null}
    </main>
  )
}
