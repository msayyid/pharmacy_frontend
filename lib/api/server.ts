import "server-only"

import createClient from "openapi-fetch"
import { headers } from "next/headers"

import type { paths } from "@/generated/api"
import { serverEnv } from "@/lib/env/server"

import { parseApiError } from "./errors"

// Server-side openapi-fetch factory for RSC + route handlers + Server Actions.
//
// Per FRONTEND_BLUEPRINT §6 + §10.2:
//   - Reads Accept-Language from the inbound request and forwards it to the
//     backend (the backend's locale resolver only reads Accept-Language;
//     no ?lang query, no cookie — verified at pharmacy_backend/app/core/i18n.py).
//   - Stamps a fresh X-Request-ID per call so the backend's RequestIdMiddleware
//     can echo it for trace correlation.
//   - Throws ApiError on non-2xx responses so the consumer can rely on a single
//     error path (instead of the openapi-fetch { data, error } tuple).
//
// PHASE 3 SCOPE: no auth here. Storefront RSC reads (categories, products,
// branches, search) are unauthenticated. Phase 5 adds an auth-aware variant
// when /me + /me/orders need RSC access — likely via a short-lived
// access-hint cookie set by the auth route handler.

export function createServerApiClient() {
  const client = createClient<paths>({
    baseUrl: serverEnv.API_URL,
  })

  client.use({
    async onRequest({ request }) {
      const accept = (await headers()).get("accept-language")
      if (accept) request.headers.set("Accept-Language", accept)
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
