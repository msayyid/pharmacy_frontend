import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { ProductCard as ProductCardData } from "@/lib/api/types"
import ru from "@/messages/ru.json"

// next-intl/server's getTranslations refuses to run outside an RSC context.
// We mock it at module load with a stub that does flat-key lookup against
// the real RU messages bundle, then dynamically import ProductCard so the
// mock is in place before its top-level imports resolve.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockImplementation(async () => {
    const dict = ru as Record<string, string>
    return (key: string) => dict[key] ?? key
  }),
}))

const { ProductCard } = await import("@/components/product/ProductCard")

async function renderProductCard(product: ProductCardData) {
  const element = await ProductCard({ product, locale: "ru" })
  return render(element)
}

const baseProduct: ProductCardData = {
  id: "019df06a-0000-7000-8000-000000000001",
  sku: "PAR-500-20",
  slug: "par-500-20",
  form: "tablet",
  is_featured: false,
  name: "Парацетамол 500 мг",
  short_description: "Жаропонижающее и обезболивающее средство",
  price: "120.00",
  compare_at_price: null,
  currency: "KGS",
  is_in_stock: true,
  thumbnail_url: null,
  score: null,
}

describe("ProductCard", () => {
  it("renders the product name and short description", async () => {
    await renderProductCard(baseProduct)
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Парацетамол 500 мг")
    expect(screen.getByText(/Жаропонижающее/)).toBeInTheDocument()
  })

  it("in-stock variant: enables the CTA with localized 'Добавить в корзину'", async () => {
    await renderProductCard(baseProduct)
    const cta = screen.getByRole("button", { name: /Добавить в корзину/ })
    expect(cta).toBeEnabled()
    expect(cta).not.toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("article")).toHaveAttribute("data-stock", "in-stock")
  })

  it("out-of-stock variant: disables the CTA, swaps label, surfaces StockPip", async () => {
    await renderProductCard({ ...baseProduct, is_in_stock: false })
    const cta = screen.getByRole("button")
    expect(cta).toBeDisabled()
    expect(cta).toHaveAttribute("aria-disabled", "true")
    expect(cta).toHaveTextContent(/Нет в наличии/)
    expect(screen.getByRole("article")).toHaveAttribute("data-stock", "out-of-stock")
    // StockPip label visible (not sr-only) when out of stock.
    const article = screen.getByRole("article")
    expect(within(article).getAllByText(/Нет в наличии/).length).toBeGreaterThan(0)
  })

  it("no-image variant: renders the brand-pill fallback (no <img>)", async () => {
    const { container } = await renderProductCard({ ...baseProduct, thumbnail_url: null })
    expect(container.querySelector("img")).toBeNull()
    // The fallback is an aria-hidden lucide icon; data-slot=product-image
    // wrapper should still be present.
    expect(container.querySelector('[data-slot="product-image"]')).not.toBeNull()
  })

  it("with-compare-at variant: shows the struck-through compare price + current price", async () => {
    await renderProductCard({
      ...baseProduct,
      price: "100.00",
      compare_at_price: "150.00",
    })
    // Render check via PriceTag's locale-aware output: ru → "100 сом" /
    // "150 сом" with thin space (U+2009) between digits. PriceTag emits
    // two `сом` suffixes (compare + current) when compare-at is set.
    expect(screen.getAllByText(/сом/).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/150/)).toBeInTheDocument()
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it("data-stock attribute reflects is_in_stock for downstream styling/QA hooks", async () => {
    await renderProductCard(baseProduct)
    expect(screen.getByRole("article")).toHaveAttribute("data-stock", "in-stock")

    const { container } = await renderProductCard({ ...baseProduct, is_in_stock: false })
    const oosArticle = within(container).getByRole("article")
    expect(oosArticle).toHaveAttribute("data-stock", "out-of-stock")
  })
})
