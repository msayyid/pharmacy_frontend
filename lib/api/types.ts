// Friendly type aliases over the auto-generated openapi-typescript output.
// Components and pages MUST consume these aliases — never reach into
// `components["schemas"]["..."]` directly. When a backend bump renames a
// schema, the diff lands here and the call sites are fixed in this file.
//
// FRONTEND_BLUEPRINT §7.4. Generated/api.d.ts is the single source of truth
// for response shapes; this file is just nicer names.

import type { components, paths } from "@/generated/api"

// ---------------------------------------------------------------------------
// Identity / auth (storefront)
// ---------------------------------------------------------------------------
export type UserMe = components["schemas"]["UserMeRead"]
export type UserMeUpdate = components["schemas"]["UserMeUpdate"]
export type Address = components["schemas"]["AddressRead"]
export type AddressCreate = components["schemas"]["AddressCreate"]
export type AddressUpdate = components["schemas"]["AddressUpdate"]
export type TokenPair = components["schemas"]["TokenPairOut"]
export type OtpRequestOut = components["schemas"]["OtpRequestOut"]

// ---------------------------------------------------------------------------
// Catalog — categories, symptoms, branches
// ---------------------------------------------------------------------------
export type CategoryNode = components["schemas"]["CategoryNode"]
export type CategoryDetail = components["schemas"]["CategoryDetail"]
export type Symptom = components["schemas"]["StorefrontSymptom"]
export type SymptomTag = components["schemas"]["StorefrontSymptomTag"]
export type Branch = components["schemas"]["StorefrontBranch"]

// ---------------------------------------------------------------------------
// Catalog — products
// ---------------------------------------------------------------------------
export type ProductCard = components["schemas"]["StorefrontProductCard"]
export type ProductDetail = components["schemas"]["StorefrontProductDetail"]
export type ProductsPage = components["schemas"]["StorefrontProductsPage"]
export type ProductImage = components["schemas"]["StorefrontImage"]
export type ProductIngredient = components["schemas"]["StorefrontIngredient"]

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
export type SearchResults = components["schemas"]["SearchResultPage"]
export type SuggestResponse = components["schemas"]["SuggestResponse"]

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------
export type CartRead = components["schemas"]["CartRead"]
export type CartItemRead = components["schemas"]["CartItemRead"]
export type CartTotalsRead = components["schemas"]["CartTotalsRead"]

// ---------------------------------------------------------------------------
// Checkout + orders
// ---------------------------------------------------------------------------
export type CheckoutQuote = components["schemas"]["CheckoutQuoteResponse"]
export type PlaceOrderRequest = components["schemas"]["PlaceOrderRequest"]
export type PlaceOrderResponse = components["schemas"]["PlaceOrderResponse"]
export type OrderRead = components["schemas"]["OrderRead"]
export type OrderListItem = components["schemas"]["OrderListItem"]
export type OrderStatusRead = components["schemas"]["OrderStatusRead"]
export type ReorderResponse = components["schemas"]["ReorderResponse"]

// ---------------------------------------------------------------------------
// openapi-fetch path-map (used by the typed client factories)
// ---------------------------------------------------------------------------
export type Paths = paths
