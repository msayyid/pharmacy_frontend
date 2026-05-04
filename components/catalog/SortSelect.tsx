"use client"

import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// SortSelect — DESIGN §12.5 + Phase 6 plan D4. URL-driven sort: the
// selected option writes `?sort=<value>` so the page is bookmarkable
// and shareable. Reads the current sort from useSearchParams; falls
// back to "relevance" when absent. Resets `?page` to 1 on sort change
// (changing sort and staying on page 5 yields surprising results).
//
// Client component because writing to the URL via router.push is a
// client-only effect of an interaction. The 4 option labels resolve
// via useTranslations against the same i18n keys the SSR-fallback
// would have rendered.

export type SortValue = "relevance" | "price_asc" | "price_desc" | "name_asc"

const ORDER: SortValue[] = ["relevance", "price_asc", "price_desc", "name_asc"]
const DEFAULT_SORT: SortValue = "relevance"

export interface SortSelectProps {
  /** Optional id passed to the trigger; useful when an external label
   *  (e.g. <Label htmlFor>) needs to point at the field. */
  id?: string
  className?: string
}

export function SortSelect({ id, className }: SortSelectProps) {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = (searchParams.get("sort") as SortValue | null) ?? DEFAULT_SORT

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === DEFAULT_SORT) {
      params.delete("sort")
    } else {
      params.set("sort", next)
    }
    params.delete("page")
    const query = params.toString()
    const url = query ? `?${query}` : ""
    router.push(url, { scroll: false })
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger
        {...(id ? { id } : {})}
        aria-label={t("category.sort_label")}
        className={className}
      >
        <SelectValue placeholder={t("category.sort_label")} />
      </SelectTrigger>
      <SelectContent>
        {ORDER.map((value) => (
          <SelectItem key={value} value={value}>
            {t(`category.sort.${value}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
