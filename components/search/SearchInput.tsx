"use client"

import { useQuery } from "@tanstack/react-query"
import { SearchIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import * as React from "react"

import { SearchSuggest } from "@/components/search/SearchSuggest"
import { getApiClientForLocale } from "@/lib/api/client"
import type { SuggestResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// SearchInput — DESIGN §12.2 + Phase 7 plan §7.4.5 + R-E mitigation.
// Header-mounted controlled input; debounces 250ms before firing the
// suggest query; dropdown surfaces SearchSuggest. Submit (Enter)
// navigates to /[locale]/search?q=<q>; Esc closes the dropdown.
//
// R-E: uses `getApiClientForLocale(locale)` so every suggest request
// hits the backend with `Accept-Language: <URL-locale>`. Without this,
// typing on /ky/* would use the browser's default Accept-Language and
// surface RU results — same shape of bug as Phase 6 server-side R-D.
// Verification gate scheduled for end of 7E (per Phase 7 plan).
//
// Keyboard model: ArrowDown from the input enters the dropdown,
// ArrowDown/ArrowUp cycle items, Enter activates, Esc closes. Mouse
// users get hover-state navigation. The dropdown collects DOM nodes
// via `data-suggest-item="true"` (set by SearchSuggest) so we don't
// need to thread refs through the children.

const DEBOUNCE_MS = 250
const EMPTY_SUGGEST: SuggestResponse = {
  products: [],
  categories: [],
  symptoms: [],
}

export interface SearchInputProps {
  locale: string
  /** Optional CSS class for the outer wrapper; defaults to a width that
   *  fits inside the desktop header bar. Mobile callers can pass
   *  `w-full` to fill the parent. */
  className?: string
}

export function SearchInput({ locale, className }: SearchInputProps) {
  const t = useTranslations()
  const router = useRouter()

  const [rawQuery, setRawQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)

  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  // Debounce the query before kicking off the suggest fetch.
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(rawQuery.trim()), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [rawQuery])

  // Fetch suggest results via TanStack Query — gives us caching, dedup,
  // and stable identity across re-renders. Disabled below the threshold;
  // catches all errors so a transient backend outage falls through to
  // the empty dropdown rather than throwing into the React tree.
  const queryEnabled = debouncedQuery.length >= 2 && open
  const { data, isFetching } = useQuery({
    queryKey: ["search-suggest", locale, debouncedQuery],
    queryFn: async (): Promise<SuggestResponse> => {
      const client = getApiClientForLocale(locale)
      try {
        const response = await client.GET("/api/v1/search/suggest", {
          params: { query: { q: debouncedQuery } },
        } as never)
        return ((response as { data?: SuggestResponse }).data ?? EMPTY_SUGGEST) as SuggestResponse
      } catch {
        return EMPTY_SUGGEST
      }
    },
    enabled: queryEnabled,
    staleTime: 30_000,
  })

  // Close-on-outside-click. Mounting once on first open keeps the listener
  // count bounded.
  React.useEffect(() => {
    if (!open) return
    function onDocPointer(event: MouseEvent) {
      if (!wrapperRef.current) return
      if (wrapperRef.current.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDocPointer)
    return () => document.removeEventListener("mousedown", onDocPointer)
  }, [open])

  function focusFirstSuggestItem() {
    const items = wrapperRef.current?.querySelectorAll<HTMLElement>("[data-suggest-item]") ?? []
    items[0]?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (event.key === "ArrowDown" && open) {
      event.preventDefault()
      focusFirstSuggestItem()
      return
    }
    if (event.key === "Enter") {
      const trimmed = rawQuery.trim()
      if (trimmed.length === 0) return
      event.preventDefault()
      setOpen(false)
      router.push(`/${locale}/search?q=${encodeURIComponent(trimmed)}`)
    }
  }

  function handleClear() {
    setRawQuery("")
    setDebouncedQuery("")
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)} data-slot="search-input">
      <div
        className={cn(
          "border-ink-200 bg-surface-card flex h-10 items-center gap-2 rounded-md border px-3",
          "focus-within:border-brand-300",
        )}
      >
        <SearchIcon aria-hidden="true" className="text-ink-500 size-4 flex-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggest-listbox"
          aria-autocomplete="list"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={t("search.placeholder")}
          value={rawQuery}
          onChange={(event) => {
            setRawQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-full flex-1 bg-transparent outline-none",
            "text-body-sm text-ink-900 placeholder:text-ink-500",
          )}
        />
        {rawQuery.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={t("nav.close")}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md",
              "text-ink-500 hover:text-ink-900",
              "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
            )}
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
      {open ? (
        <div id="search-suggest-listbox">
          <SearchSuggest
            locale={locale}
            query={debouncedQuery}
            data={data ?? EMPTY_SUGGEST}
            loading={isFetching}
            onSelect={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  )
}
