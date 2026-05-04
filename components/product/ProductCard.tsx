import { getTranslations } from "next-intl/server"

import { AddToCartButton } from "@/components/product/AddToCartButton"
import { PriceTag } from "@/components/product/PriceTag"
import { ProductImage } from "@/components/product/ProductImage"
import { StockPip } from "@/components/product/StockPip"
import type { Locale } from "@/i18n/config"
import type { ProductCard as ProductCardData } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// ProductCard — DESIGN §11.3. RSC.
// Square image (1:1) with brand-pill fallback when thumbnail_url is null
// (DESIGN §8.4); name; StockPip; PriceTag (compare-at supported); disabled
// "Добавить в корзину" CTA per Phase 6 plan D5 (Phase 8 wires the click
// handler; no tooltip, disabled state alone is universal e-commerce
// language).
//
// Variants:
//   - "default" (Phase 6) — full card with short_description, ingredient
//     chips visible, full CTA. Used in category + symptom product grids.
//   - "compact" (Phase 7) — same shape, no short_description, smaller
//     padding. Used in SubstitutesBlock and (Phase 7E) SearchSuggest.
//   - "wide" (Phase 8) — cart line shape; ships when cart lands.

export interface ProductCardProps {
  product: ProductCardData
  locale: Locale
  variant?: "default" | "compact"
  className?: string
}

export async function ProductCard({
  product,
  locale,
  variant = "default",
  className,
}: ProductCardProps) {
  const t = await getTranslations()
  const isCompact = variant === "compact"

  return (
    <article
      data-slot="product-card"
      data-variant={variant}
      data-stock={product.is_in_stock ? "in-stock" : "out-of-stock"}
      className={cn(
        "border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border",
        isCompact ? "p-2" : "p-3",
        "hover:border-brand-200 transition-colors",
        className,
      )}
    >
      <ProductImage src={product.thumbnail_url} alt={product.name} />

      <div className="flex min-h-12 flex-col gap-1">
        <h3 className="text-body-sm text-ink-900 line-clamp-2 font-semibold">{product.name}</h3>
        {!isCompact && product.short_description ? (
          <p className="text-caption text-ink-600 line-clamp-1">{product.short_description}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <PriceTag
          price={Number(product.price)}
          {...(product.compare_at_price !== null && product.compare_at_price !== undefined
            ? { compareAt: Number(product.compare_at_price) }
            : {})}
          locale={locale}
        />
        <StockPip
          inStock={product.is_in_stock}
          label={product.is_in_stock ? "" : t("cart.out_of_stock")}
          {...(product.is_in_stock ? { className: "sr-only" } : {})}
        />
      </div>

      <AddToCartButton productId={product.id} isInStock={product.is_in_stock} quantity={1} />
    </article>
  )
}
