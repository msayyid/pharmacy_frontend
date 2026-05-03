import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"

// Receives the token pair from the OTP-verify success client and stashes the
// REFRESH token in an HttpOnly cookie at our origin. The access token is NOT
// stored — it stays in client-side memory (Zustand) per CLAUDE.md sacred
// invariant 7 + FRONTEND_BLUEPRINT §8.1 (D1 in the Phase 5 plan).
//
// The cookie is `nookat_refresh`: HttpOnly + Secure (in production) +
// SameSite=Lax + Path=/ + Max-Age=2592000s (30 days, matches the backend's
// jwt_refresh_ttl_days = 30). JS at our origin cannot read this cookie; only
// the matching /api/auth/{refresh-tokens,logout} route handlers can.

const REFRESH_COOKIE = "nookat_refresh"
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60

const SetTokensSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
})

export async function POST(request: Request) {
  let parsed: z.infer<typeof SetTokensSchema>
  try {
    parsed = SetTokensSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set(REFRESH_COOKIE, parsed.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  })

  return NextResponse.json({ ok: true })
}
