import "server-only"

import createClient from "openapi-fetch"
import { headers } from "next/headers"

import type { paths } from "@/generated/api"
import { serverEnv } from "@/lib/env/server"

import { parseApiError } from "./errors"

// Server-side openapi-fetch factory for RSC + route handlers + Server Actions.
//
// Per FRONTEND_BLUEPRINT §6 + §10.2:
//   - Sets Accept-Language so the backend's locale resolver picks the correct
//     translation (the backend reads Accept-Language only — no ?lang query,
//     no cookie — verified at pharmacy_backend/app/core/i18n.py + confirmed
//     during Phase 6 smoke).
//   - Stamps a fresh X-Request-ID per call so the backend's RequestIdMiddleware
//     can echo it for trace correlation.
//   - Throws ApiError on non-2xx responses so the consumer can rely on a single
//     error path (instead of the openapi-fetch { data, error } tuple).
//
// Locale resolution: pass the URL-segment locale (`/[locale]/...`) explicitly.
// The URL is the source of truth — when a request hits `/ky/...`, we want the
// backend response in Kyrgyz regardless of the browser's `Accept-Language`
// header (which often disagrees: a Russian-speaker browsing the EN page
// expects English content). Surfaced during Phase 6 smoke when /ky/ returned
// Russian symptom names because the inbound Accept-Language fell through.
// If `locale` is omitted (e.g., a route handler that doesn't know the URL
// locale yet), we forward the inbound Accept-Language as a fallback.
//
// PHASE 3 SCOPE: no auth here. Storefront RSC reads (categories, products,
// branches, search) are unauthenticated. Phase 5 adds an auth-aware variant
// when /me + /me/orders need RSC access — likely via a short-lived
// access-hint cookie set by the auth route handler.

export function createServerApiClient(locale?: string) {
  const client = createClient<paths>({
    baseUrl: serverEnv.API_URL,
  })

  client.use({
    async onRequest({ request }) {
      if (locale) {
        request.headers.set("Accept-Language", locale)
      } else {
        const accept = (await headers()).get("accept-language")
        if (accept) request.headers.set("Accept-Language", accept)
      }
      request.headers.set("X-Request-ID", crypto.randomUUID())
      return request
    },
    async onResponse({ response }) {
      if (!response.ok) {
        throw await parseApiError(response.clone())
      }
      return response
    },
  })

  return client
}
