import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ImageCarousel } from "@/components/product/ImageCarousel"
import type { ProductImage } from "@/lib/api/types"

// ImageCarousel tests focus on the empty and single-image branches that
// don't actually instantiate Embla (jsdom lacks ResizeObserver and the
// layout primitives Embla depends on, so multi-image carousel behavior
// is covered by E2E rather than here).

const imageA: ProductImage = {
  id: 1,
  url: "https://cdn.example.com/a.jpg",
  thumbnail_url: "https://cdn.example.com/a-thumb.jpg",
  medium_url: "https://cdn.example.com/a-med.jpg",
  large_url: "https://cdn.example.com/a-large.jpg",
  alt_text: "Product image A",
  is_primary: true,
}

const imageB: ProductImage = {
  ...imageA,
  id: 2,
  url: "https://cdn.example.com/b.jpg",
  thumbnail_url: "https://cdn.example.com/b-thumb.jpg",
  large_url: "https://cdn.example.com/b-large.jpg",
  alt_text: "Product image B",
  is_primary: false,
}

describe("ImageCarousel", () => {
  it("renders the brand-pill fallback when images is empty", () => {
    const { container } = render(<ImageCarousel images={[]} alt="Парацетамол" />)
    expect(container.querySelector('[data-slot="image-carousel-empty"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="product-image"]')).not.toBeNull()
    expect(container.querySelector("img")).toBeNull()
  })

  it("renders a single image without carousel chrome when images.length === 1", () => {
    const { container } = render(<ImageCarousel images={[imageA]} alt="Парацетамол" />)
    expect(container.querySelector('[data-slot="image-carousel-single"]')).not.toBeNull()
    // No prev/next buttons or thumbnail strip in single-image mode.
    expect(screen.queryByRole("button", { name: /Previous image/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Next image/ })).toBeNull()
  })

  // Multi-image branch instantiates Embla, which calls
  // `matchMedia(...).addEventListener` and other DOM APIs jsdom doesn't
  // provide. Multi-image rendering + interaction is covered in E2E
  // (tests/e2e/pdp-flow.spec.ts) where a real Chromium runs the code.
  it.skip("renders carousel chrome (prev/next + thumbnail buttons) for ≥2 images", () => {
    render(<ImageCarousel images={[imageA, imageB]} alt="Парацетамол" />)
    expect(screen.getByRole("button", { name: /Previous image/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Next image/ })).toBeInTheDocument()
  })
})
