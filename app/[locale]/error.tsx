"use client"

import { AlertCircleIcon, PhoneIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/feedback/ErrorState"
import { BRAND } from "@/lib/brand"
import { trace } from "@/lib/observability/trace"

// Locale-aware segment-level error boundary. Phase 11C.
//
// Triggered when a child route throws and the page itself didn't catch.
// We intentionally route this through `<ErrorState>` (DESIGN §14.3) and
// surface the support phone (sacred-invariant #4: customer support phone
// always one tap away).
//
// PII discipline: do NOT log error.message verbatim — Sentry will capture
// the stack trace via the SDK init's automatic global error handler. We
// only emit a breadcrumb with the digest (Next attaches a stable digest
// to errors that crossed the server/client boundary).

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LocaleErrorBoundary({ error, reset }: ErrorPageProps) {
  const t = useTranslations()

  React.useEffect(() => {
    trace({
      category: "render.error",
      message: "locale_error_boundary",
      level: "error",
      data: { digest: error.digest ?? null },
    })
  }, [error])

  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-4 px-4 py-12 md:px-6 md:py-16">
      <ErrorState
        icon={AlertCircleIcon}
        title={t("error.generic")}
        body={t("error.network")}
        {...(error.digest ? { code: error.digest } : {})}
        cta={
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button variant="default" onClick={() => reset()}>
              {t("common.retry")}
            </Button>
            <Button variant="outline" asChild>
              <a href={`tel:${BRAND.supportPhone.replace(/\s+/g, "")}`}>
                <PhoneIcon aria-hidden="true" className="size-4" />
                {BRAND.supportPhone}
              </a>
            </Button>
          </div>
        }
      />
    </main>
  )
}
