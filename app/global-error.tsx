"use client"

import * as React from "react"

import { trace } from "@/lib/observability/trace"

// Root-level error boundary. Phase 11C.
//
// Triggers when the LOCALE layout itself throws (rare — usually a Provider
// crashes during init). Renders bare HTML — there is no NextIntlClientProvider
// in scope, so we cannot use `t(...)`. English fallback copy is the safest
// floor. Sacred-invariant #4 still applies: support phone is in the BRAND
// constant, available without any client init beyond React itself.

import { BRAND } from "@/lib/brand"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  React.useEffect(() => {
    trace({
      category: "render.error",
      message: "global_error_boundary",
      level: "error",
      data: { digest: error.digest ?? null },
    })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          background: "#fafafa",
          color: "#171717",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Something went wrong
        </h1>
        <p style={{ maxWidth: "32rem", color: "#525252", marginBottom: "1.5rem" }}>
          We&apos;re sorry — please try again, or call us at{" "}
          <a href={`tel:${BRAND.supportPhone.replace(/\s+/g, "")}`} style={{ color: "#171717" }}>
            {BRAND.supportPhone}
          </a>
          .
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.5rem",
            border: "1px solid #d4d4d4",
            background: "#171717",
            color: "white",
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
