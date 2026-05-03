import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { serverEnv } from "@/lib/env/server"

// Reads the HttpOnly `nookat_refresh` cookie, proxies to backend
// POST /api/v1/auth/refresh, rotates the cookie with the new refresh token,
// and returns the new access token + expires_in to the client.
//
// Backend rotates the refresh `jti` server-side: the old refresh token
// becomes invalid the moment we get the new one. If two simultaneous refreshes
// land on the backend (multi-tab — see DECISION_LOG R-E), one wins and the
// other 401s. The single-flight guard in lib/auth/refresh.ts prevents this on
// a single tab; cross-tab sync is Phase 11+.

const REFRESH_COOKIE = "nookat_refresh"
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60

export async function POST() {
  const cookieStore = await cookies()
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value
  if (!refresh) {
    return NextResponse.json({ error: "no_refresh" }, { status: 401 })
  }

  const upstream = await fetch(`${serverEnv.API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  })

  if (!upstream.ok) {
    // Backend rejected our refresh (expired, revoked, jti rotated by another
    // tab, etc.). Drop the cookie so the next /me read prompts re-login.
    cookieStore.delete(REFRESH_COOKIE)
    return NextResponse.json(
      { error: "refresh_failed", upstream_status: upstream.status },
      { status: 401 },
    )
  }

  const pair = (await upstream.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  cookieStore.set(REFRESH_COOKIE, pair.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  })

  return NextResponse.json({
    access_token: pair.access_token,
    expires_in: pair.expires_in,
  })
}
