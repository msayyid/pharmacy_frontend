"use client"

import createClient from "openapi-fetch"

import type { paths } from "@/generated/api"
import { clientEnv } from "@/lib/env/client"
import { useAuthStore } from "@/lib/auth/store"
import { refreshAccessToken } from "@/lib/auth/refresh"

import { parseApiError } from "./errors"

// Browser-side openapi-fetch singleton. Used by client components, TanStack
// Query mutations, and form submissions.
//
// Per FRONTEND_BLUEPRINT §8 + §10.3:
//   - `credentials: "include"` so the guest cart cookie (`pharmacy_cart_session`)
//     and any future admin session cookie flow on cross-origin calls.
//   - Authorization: Bearer <token> attached when the auth store has a token,
//     EXCEPT on /api/v1/auth/* endpoints (those don't need it; including it
//     would create a refresh loop on /auth/refresh).
//   - Accept-Language pinned per-call when a `locale` is provided, matching
//     the URL-segment locale (Phase 6 D11 server-side pattern carried over to
//     the client; Phase 7 R-E mitigation). Without an explicit locale, falls
//     back to the browser's default Accept-Language — which is fine for
//     locale-agnostic endpoints (auth, cart) but wrong for catalog/search
//     where the URL segment is authoritative.
//   - X-Request-ID stamped per call for trace correlation.
//   - 401 → call refreshAccessToken() then retry once. The Phase-3 stub
//     returns null, so 401s fall through to throwing ApiError. Phase 5 fills
//     in the actual single-flight refresh.
//   - Throws ApiError on non-2xx so consumers (TanStack Query mutations) get
//     the standard error path. The openapi-fetch { data, error } tuple is
//     bypassed in favour of try/catch.
//
// Architecture: `createBrowserApiClient(opts)` is the factory; the module
// exports a default singleton `apiClient` for production use, and tests use
// the factory with a custom `fetch` to inject mock responses. Locale-aware
// callers (Phase 7 SearchInput/SearchSuggest) pass `{ locale }` to get a
// client with Accept-Language pinned to the URL segment.

const AUTH_ENDPOINT_PREFIX = "/api/v1/auth/"

function isAuthEndpoint(requestUrl: string): boolean {
  try {
    return new URL(requestUrl).pathname.startsWith(AUTH_ENDPOINT_PREFIX)
  } catch {
    // Relative URL or malformed — treat as non-auth (the call will fail
    // anyway and parseApiError will surface the underlying error).
    return false
  }
}

export interface BrowserApiClientOptions {
  baseUrl?: string
  fetch?: typeof fetch
  /** URL-segment locale, e.g. "ru" / "ky" / "en". When set, every outbound
   *  request gets `Accept-Language: <locale>` to override the browser's
   *  default. Phase 7 R-E mitigation: client-side calls hitting the
   *  storefront catalog (search, suggest) must reach the backend with the
   *  URL locale, not whatever the browser says it prefers. */
  locale?: string
}

export function createBrowserApiClient(opts: BrowserApiClientOptions = {}) {
  const { baseUrl = clientEnv.NEXT_PUBLIC_API_URL, fetch: customFetch, locale } = opts

  const client = createClient<paths>({
    baseUrl,
    credentials: "include",
    ...(customFetch ? { fetch: customFetch } : {}),
  })

  client.use({
    async onRequest({ request }) {
      const onAuth = isAuthEndpoint(request.url)
      const token = useAuthStore.getState().accessToken
      if (token && !onAuth) {
        request.headers.set("Authorization", `Bearer ${token}`)
      }
      if (locale) {
        request.headers.set("Accept-Language", locale)
      }
      request.headers.set("X-Request-ID", crypto.randomUUID())
      return request
    },

    async onResponse({ request, response }) {
      if (response.status === 401 && !isAuthEndpoint(request.url)) {
        const newToken = await refreshAccessToken()
        if (newToken) {
          const retryHeaders = new Headers(request.headers)
          retryHeaders.set("Authorization", `Bearer ${newToken}`)
          const retryFetch = customFetch ?? fetch
          return retryFetch(new Request(request, { headers: retryHeaders }))
        }
      }
      if (!response.ok) {
        throw await parseApiError(response.clone())
      }
      return response
    },
  })

  return client
}

export const apiClient = createBrowserApiClient()

// Locale-aware factory cache. SearchInput / SearchSuggest call this once per
// locale change; subsequent calls reuse the same client. Avoids re-installing
// the middleware chain on every keystroke. Keys are 2-letter locale codes;
// the cache is small (≤3 entries) and never invalidated — clients are pure
// once constructed.
const localeClients = new Map<string, ReturnType<typeof createBrowserApiClient>>()

export function getApiClientForLocale(locale: string): ReturnType<typeof createBrowserApiClient> {
  const cached = localeClients.get(locale)
  if (cached) return cached
  const client = createBrowserApiClient({ locale })
  localeClients.set(locale, client)
  return client
}
