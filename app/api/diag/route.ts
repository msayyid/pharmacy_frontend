import { NextResponse } from "next/server"
import { notFound } from "next/navigation"

import { ApiError } from "@/lib/api/errors"
import { createServerApiClient } from "@/lib/api/server"

// Dev/staging-only diagnostic. Hits the backend's /health and echoes the
// result + the X-Request-ID we sent. Production builds 404 (per Phase 3 plan
// D12) — same gate pattern as the kitchen sink.
//
// Smoke target: `curl http://localhost:3000/api/diag` against a running
// backend should return:
//   { ok: true, backend: { status: "ok", version: "..." }, requestId: "<uuid>" }
//
// The route exists in production builds but returns 404; staging keeps it
// reachable so ops can verify the wire end-to-end after a deploy.

export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.NEXT_PUBLIC_ENV === "production") {
    notFound()
  }

  const requestId = crypto.randomUUID()
  const client = createServerApiClient()

  try {
    const { data, response } = await client.GET("/health" as never)
    return NextResponse.json({
      ok: true,
      backend: data,
      requestId: response?.headers.get("x-request-id") ?? requestId,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            status: error.status,
            requestId: error.requestId,
          },
        },
        { status: 502 },
      )
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "diagnostic_failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 502 },
    )
  }
}
