import * as React from "react"

import { BRAND, type BrandLocale } from "@/lib/brand"
import type { ProductDetail } from "@/lib/api/types"

// JSON-LD helpers. Phase 11A.
//
// XSS hardening (R-B from plan): JSON.stringify can produce a literal
// `</script>` if any string field contains it (e.g. a malicious product
// name). We escape `<` to `<` (and `>` and `&` for completeness)
// per OWASP. The output is still valid JSON because string-content
// `<` is decoded by JSON parsers back to `<`.
//
// DECISION_LOG D-? — `dangerouslySetInnerHTML` exception:
// CLAUDE.md hard-prohibition #11 forbids dSI for backend-returned text
// content. The threat model there is malformed-API-bytes. JSON-LD is
// FE-controlled: we serialize a typed object with JSON.stringify
// ourselves, then escape the `<` byte that's the only XSS vector for
// `<script>` content. This is the canonical Next.js JSON-LD pattern
// (https://nextjs.org/docs/app/guides/json-ld).
//
// Grep-guard: any other use of dangerouslySetInnerHTML in the codebase
// is still forbidden. Phase 11 verification gate runs:
//   grep -rEn 'dangerouslySetInnerHTML' app/ components/ lib/
//     | grep -v 'lib/seo/jsonld.tsx'
// and the result must be empty.

function safeStringify(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
}

export interface JsonLdProps {
  value: unknown
}

export function JsonLd({ value }: JsonLdProps): React.ReactElement {
  return (
    <script
      type="application/ld+json"
      // Phase 11A safe-stringify (see file header).
      dangerouslySetInnerHTML={{ __html: safeStringify(value) }}
    />
  )
}

// ─── schema.org Organization ───────────────────────────────────────────────
// Identifies the pharmacy as the publishing organization.

export interface OrganizationJsonLdInput {
  locale: BrandLocale
  siteUrl: string
}

export function organizationJsonLd({ locale, siteUrl }: OrganizationJsonLdInput): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: BRAND.nameLocalized[locale] ?? BRAND.name,
    url: siteUrl,
    logo: `${siteUrl}/brand/logo-mark.svg`,
    address: {
      "@type": "PostalAddress",
      addressLocality: locale === "en" ? "Nookat" : "Ноокат",
      addressRegion: locale === "en" ? "Osh region" : "Ошская область",
      addressCountry: "KG",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: BRAND.supportPhone,
      contactType: "customer support",
    },
  }
}

// ─── schema.org LocalBusiness ──────────────────────────────────────────────
// Identifies a single physical pharmacy. Per Q-1 (single-branch MVP), one
// LocalBusiness on the home page; per-branch LocalBusiness lands when
// multi-branch picker ships post-MVP.

export interface LocalBusinessJsonLdInput {
  locale: BrandLocale
  siteUrl: string
}

export function localBusinessJsonLd({ locale, siteUrl }: LocalBusinessJsonLdInput): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "Pharmacy",
    "@id": `${siteUrl}/#pharmacy`,
    name: BRAND.nameLocalized[locale] ?? BRAND.name,
    url: siteUrl,
    image: `${siteUrl}/brand/logo-mark.svg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: BRAND.address[locale],
      addressLocality: locale === "en" ? "Nookat" : "Ноокат",
      addressRegion: locale === "en" ? "Osh region" : "Ошская область",
      addressCountry: "KG",
    },
    telephone: BRAND.supportPhone,
    priceRange: "$$",
  }
}

// ─── schema.org WebSite ────────────────────────────────────────────────────
// Plus a SearchAction so Google offers a search box in SERPs.

export interface WebSiteJsonLdInput {
  locale: BrandLocale
  siteUrl: string
}

export function websiteJsonLd({ locale, siteUrl }: WebSiteJsonLdInput): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: BRAND.nameLocalized[locale] ?? BRAND.name,
    url: siteUrl,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/${locale}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

// ─── schema.org Product ────────────────────────────────────────────────────
// Emitted on PDP. `availability` mirrors `is_in_stock`. `priceCurrency`
// is fixed KGS at MVP (Q-? single-currency).

export interface ProductJsonLdInput {
  product: ProductDetail
  locale: BrandLocale
  siteUrl: string
}

export function productJsonLd({ product, locale, siteUrl }: ProductJsonLdInput): unknown {
  const pageUrl = `${siteUrl}/${locale}/products/${product.slug}`
  const images = product.images
    .map((img) => img.large_url ?? img.url)
    .filter((url): url is string => Boolean(url))

  const offers: Record<string, unknown> = {
    "@type": "Offer",
    url: pageUrl,
    priceCurrency: "KGS",
    price: product.price,
    availability: product.is_in_stock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
  }

  // schema.org Brand applies when manufacturer is known.
  const brand = product.manufacturer_name
    ? { "@type": "Brand", name: product.manufacturer_name }
    : undefined

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${pageUrl}#product`,
    name: product.name,
    sku: product.sku,
    ...(product.short_description ? { description: product.short_description } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(brand ? { brand } : {}),
    offers,
  }
}

// ─── schema.org BreadcrumbList ─────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string
  item: string
}

export function breadcrumbListJsonLd(items: BreadcrumbItem[]): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: entry.name,
      item: entry.item,
    })),
  }
}
