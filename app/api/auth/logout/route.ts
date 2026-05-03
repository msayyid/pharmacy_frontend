import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { serverEnv } from "@/lib/env/server"

// Calls backend POST /api/v1/auth/logout to revoke the refresh `jti`, then
// drops the HttpOnly cookie at our origin. Idempotent — if the cookie is
// already absent, returns 204 without calling the backend (no-op for a
// caller that's already logged out).
//
// Best-effort backend call: even if the backend is unreachable, we still
// clear the local cookie so the user is logged out at our origin.

const REFRESH_COOKIE = "nookat_refresh"

export async function POST() {
  const cookieStore = await cookies()
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value

  if (refresh) {
    try {
      await fetch(`${serverEnv.API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      })
    } catch {
      // Backend down or unreachable — local cleanup still proceeds.
    }
  }

  cookieStore.delete(REFRESH_COOKIE)
  return new NextResponse(null, { status: 204 })
}
