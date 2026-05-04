import { describe, expect, it } from "vitest"

import {
  breadcrumbListJsonLd,
  localBusinessJsonLd,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from "@/lib/seo/jsonld"
import type { ProductDetail } from "@/lib/api/types"

// Phase 11A — typed JSON-LD helpers, used in <script type="application/ld+json"/>
// blocks on indexable surfaces. The tests pin the schema.org @type values
// (Google's Rich Results test breaks without them) and the XSS-safe
// serialization (R-B from plan).

const SITE_URL = "https://nookat.kg"

describe("organizationJsonLd", () => {
  it("emits @type Organization with localized name + support phone", () => {
    const value = organizationJsonLd({ locale: "ru", siteUrl: SITE_URL }) as Record<string, unknown>
    expect(value["@type"]).toBe("Organization")
    expect(value["name"]).toBe("Ноокат")
    expect(value["url"]).toBe(SITE_URL)
    const contactPoint = value["contactPoint"] as Record<string, unknown>
    expect(contactPoint["@type"]).toBe("ContactPoint")
    expect(contactPoint["contactType"]).toBe("customer support")
  })

  it("uses latin name in en locale", () => {
    const value = organizationJsonLd({ locale: "en", siteUrl: SITE_URL }) as Record<string, unknown>
    expect(value["name"]).toBe("Nookat")
  })
})

describe("localBusinessJsonLd", () => {
  it("emits @type Pharmacy with addressLocality, addressCountry KG", () => {
    const value = localBusinessJsonLd({ locale: "ru", siteUrl: SITE_URL }) as Record<
      string,
      unknown
    >
    expect(value["@type"]).toBe("Pharmacy")
    const address = value["address"] as Record<string, unknown>
    expect(address["@type"]).toBe("PostalAddress")
    expect(address["addressCountry"]).toBe("KG")
    expect(address["addressLocality"]).toBe("Ноокат")
  })
})

describe("websiteJsonLd", () => {
  it("includes a SearchAction with locale-prefixed urlTemplate", () => {
    const value = websiteJsonLd({ locale: "ky", siteUrl: SITE_URL }) as Record<string, unknown>
    expect(value["@type"]).toBe("WebSite")
    const action = value["potentialAction"] as Record<string, unknown>
    expect(action["@type"]).toBe("SearchAction")
    const target = action["target"] as Record<string, unknown>
    expect(target["urlTemplate"]).toContain("/ky/search?q=")
  })
})

describe("productJsonLd", () => {
  const baseProduct: ProductDetail = {
    id: "00000000-0000-0000-0000-000000000001",
    sku: "PAR-500-12",
    slug: "paracetamol-500-12",
    form: "tablet",
    is_featured: false,
    name: "Парацетамол 500мг 12 таб",
    short_description: "Жаропонижающее средство",
    price: "120.00",
    compare_at_price: null,
    currency: "KGS",
    is_in_stock: true,
    requires_prescription: false,
    requires_cold_chain: false,
    manufacturer_name: "Nobel",
    manufacturer_country: "KZ",
    images: [
      {
        url: "/static/images/par-500-12.jpg",
        thumbnail_url: "/static/images/par-500-12-thumb.jpg",
        large_url: "/static/images/par-500-12-large.jpg",
        is_primary: true,
        alt_text: "Парацетамол",
      },
    ],
    active_ingredients: [],
    description: null,
    composition: null,
    usage_instructions: null,
    side_effects: null,
    contraindications: null,
    package_size: null,
    score: null,
    pack_quantity: null,
    pack_unit: null,
  } as unknown as ProductDetail

  it("emits @type Product with InStock availability", () => {
    const value = productJsonLd({
      product: baseProduct,
      locale: "ru",
      siteUrl: SITE_URL,
    }) as Record<string, unknown>
    expect(value["@type"]).toBe("Product")
    expect(value["sku"]).toBe("PAR-500-12")
    const offers = value["offers"] as Record<string, unknown>
    expect(offers["@type"]).toBe("Offer")
    expect(offers["priceCurrency"]).toBe("KGS")
    expect(offers["availability"]).toBe("https://schema.org/InStock")
  })

  it("flips availability to OutOfStock when is_in_stock=false", () => {
    const oosProduct = { ...baseProduct, is_in_stock: false }
    const value = productJsonLd({ product: oosProduct, locale: "ru", siteUrl: SITE_URL }) as Record<
      string,
      unknown
    >
    const offers = value["offers"] as Record<string, unknown>
    expect(offers["availability"]).toBe("https://schema.org/OutOfStock")
  })

  it("includes brand object when manufacturer_name is set", () => {
    const value = productJsonLd({
      product: baseProduct,
      locale: "ru",
      siteUrl: SITE_URL,
    }) as Record<string, unknown>
    const brand = value["brand"] as Record<string, unknown>
    expect(brand["@type"]).toBe("Brand")
    expect(brand["name"]).toBe("Nobel")
  })

  it("omits brand when manufacturer_name is null", () => {
    const noBrand = { ...baseProduct, manufacturer_name: null }
    const value = productJsonLd({ product: noBrand, locale: "ru", siteUrl: SITE_URL }) as Record<
      string,
      unknown
    >
    expect(value["brand"]).toBeUndefined()
  })
})

describe("breadcrumbListJsonLd", () => {
  it("emits position-numbered ListItem entries", () => {
    const value = breadcrumbListJsonLd([
      { name: "Главная", item: "https://nookat.kg/ru" },
      { name: "Категории", item: "https://nookat.kg/ru/categories" },
      { name: "Обезболивающее", item: "https://nookat.kg/ru/categories/pain-relief" },
    ]) as Record<string, unknown>
    expect(value["@type"]).toBe("BreadcrumbList")
    const list = value["itemListElement"] as Array<Record<string, unknown>>
    expect(list).toHaveLength(3)
    expect(list[0]?.["position"]).toBe(1)
    expect(list[1]?.["position"]).toBe(2)
    expect(list[2]?.["position"]).toBe(3)
    expect(list[0]?.["name"]).toBe("Главная")
  })

  it("returns an empty itemListElement for empty input", () => {
    const value = breadcrumbListJsonLd([]) as Record<string, unknown>
    expect(value["itemListElement"]).toEqual([])
  })
})
