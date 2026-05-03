import { useAuthStore } from "./store"

// Single-flight refresh — Phase 5 fills in the Phase 3 stub.
//
// Per FRONTEND_BLUEPRINT §8.3: a module-level `inFlight` Promise dedupes
// concurrent 401s across the app so 5 simultaneous in-flight requests share
// ONE refresh round-trip rather than triggering 5 separate ones (thundering
// herd).
//
// Flow:
//   1. POST /api/auth/refresh-tokens (Next route handler at our origin reads
//      the HttpOnly cookie, proxies to backend POST /api/v1/auth/refresh,
//      rotates the cookie, returns the new access_token + expires_in).
//   2. On success: update useAuthStore via setTokens(...) + return the new
//      access token. The client fetcher's 401 interceptor retries with it.
//   3. On failure (refresh expired / revoked / network / cookie missing):
//      clear useAuthStore + return null. The client fetcher's 401 interceptor
//      then throws ApiError; consumers (TanStack Query mutations) handle it.
//      The middleware's hard-gate redirect on next navigation kicks the user
//      to /auth/otp.
//
// Multi-tab caveat (DECISION_LOG R-E, deferred to Phase 11): if a second tab
// completes a refresh while the first tab still holds the old refresh, the
// first tab's next refresh attempt 401s and the user appears to "log out
// silently." Single-tab is the supported MVP scenario.

let inFlight: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const response = await fetch("/api/auth/refresh-tokens", {
        method: "POST",
        credentials: "same-origin",
      })

      if (!response.ok) {
        useAuthStore.getState().clear()
        return null
      }

      const body = (await response.json()) as {
        access_token: string
        expires_in: number
      }

      useAuthStore.getState().setTokens(body.access_token, body.expires_in)
      return body.access_token
    } catch {
      useAuthStore.getState().clear()
      return null
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

// Test-only: reset the in-flight promise between tests.
export function _resetInFlightForTesting(): void {
  inFlight = null
}
