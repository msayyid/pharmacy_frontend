"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type AbstractIntlMessages, NextIntlClientProvider } from "next-intl"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import * as React from "react"

import { ApiError } from "@/lib/api/errors"

// AppProviders wraps the [locale] subtree with the three client-side
// providers the app depends on:
//
//   - QueryClientProvider (TanStack Query) — server-state cache + refetch
//     coordination. Defaults per FRONTEND_BLUEPRINT §10.4.
//   - NextIntlClientProvider — exposes useTranslations / useLocale to client
//     components. Server components use getTranslations directly.
//   - TooltipPrimitive.Provider — Radix tooltip context (Phase 2).
//
// Stable QueryClient identity per render via useState + factory function.
// Locale changes recreate the layout tree (because [locale] is a dynamic
// segment), which recreates the QueryClient — acceptable cost: locale
// change is rare, cache rebuild is cheap, and the alternative (lifting
// the QueryClient above the locale segment) would re-introduce
// app/layout.tsx that Phase 4 deliberately removed.

interface AppProvidersProps {
  locale: string
  messages: AbstractIntlMessages
  children: React.ReactNode
}

export function AppProviders({ locale, messages, children }: AppProvidersProps) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Retry only on 5xx (transient backend hiccups). 4xx is the
              // user's problem (auth, validation, 404) — surface immediately.
              if (error instanceof ApiError) {
                return error.status >= 500 && failureCount < 2
              }
              // Non-ApiError (network failure) — retry once.
              return failureCount < 1
            },
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Bishkek">
        <TooltipPrimitive.Provider>{children}</TooltipPrimitive.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  )
}
