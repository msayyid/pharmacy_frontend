import { getTranslations } from "next-intl/server"

import { PriceTag } from "@/components/product/PriceTag"
import { ProductImage } from "@/components/product/ProductImage"
import { StockPip } from "@/components/product/StockPip"
import type { Locale } from "@/i18n/config"
import type { ProductCard as ProductCardData } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// ProductCard — DESIGN §11.3 default variant. RSC.
// Square image (1:1) with brand-pill fallback when thumbnail_url is null
// (DESIGN §8.4); name + dosage label; StockPip; PriceTag (compare-at
// supported); disabled "Добавить в корзину" CTA per Phase 6 plan D5
// (Phase 8 wires the click handler; D5 confirmed: no tooltip, disabled
// state alone is universal e-commerce language).
//
// Compact + wide variants land in Phase 6D / Phase 7 (search suggest)
// / Phase 8 (cart line) — they share this component's shape with
// different layout class sets.

export interface ProductCardProps {
  product: ProductCardData
  locale: Locale
  className?: string
}

export async function ProductCard({ product, locale, className }: ProductCardProps) {
  const t = await getTranslations()
  const stockLabel = product.is_in_stock ? t("product.add_to_cart") : t("cart.out_of_stock")
  const ctaDisabled = !product.is_in_stock

  return (
    <article
      data-slot="product-card"
      data-stock={product.is_in_stock ? "in-stock" : "out-of-stock"}
      className={cn(
        "border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-3",
        "hover:border-brand-200 transition-colors",
        className,
      )}
    >
      <ProductImage src={product.thumbnail_url} alt={product.name} />

      <div className="flex min-h-12 flex-col gap-1">
        <h3 className="text-body-sm text-ink-900 line-clamp-2 font-semibold">{product.name}</h3>
        {product.short_description ? (
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

      <button
        type="button"
        disabled={ctaDisabled}
        aria-disabled={ctaDisabled}
        className={cn(
          "text-body-sm inline-flex items-center justify-center rounded-md px-3 py-2 font-medium",
          "bg-brand-500 text-white",
          "hover:bg-brand-600",
          "disabled:bg-ink-200 disabled:text-ink-500 disabled:cursor-not-allowed",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        {stockLabel}
      </button>
    </article>
  )
}
