// TODO: Phase 5 — single-flight refresh against /api/auth/refresh-tokens.
//
// Phase 3 stub: returns null so the client fetcher's 401 interceptor falls
// through to throwing ApiError(...) instead of looping. Phase 5 implements:
//
//   1. Dedup concurrent refresh attempts via a module-level Promise (so 5
//      simultaneous 401s share ONE network round-trip, not five).
//   2. POST to /api/auth/refresh-tokens — a Next.js Route Handler at our
//      origin that reads the HttpOnly `nookat_refresh` cookie, proxies to
//      backend POST /api/v1/auth/refresh, rotates both the cookie and the
//      in-memory access token in `useAuthStore`.
//   3. On success: update `useAuthStore.setAccessToken(...)` + return the new
//      access token to the interceptor for retry.
//   4. On failure (refresh expired / revoked / network): clear
//      `useAuthStore`, drop the cookie, and redirect to /auth/otp.
//
// Tests in Phase 5 must cover: thundering herd dedup, refresh-failure path,
// retry-once semantics, no-loop on /api/v1/auth/* endpoints.

export async function refreshAccessToken(): Promise<string | null> {
  return null
}
