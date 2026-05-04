import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { SearchSuggest } from "@/components/search/SearchSuggest"
import type { SuggestResponse } from "@/lib/api/types"
import { unflattenMessages } from "@/i18n/unflatten"
import ru from "@/messages/ru.json"

function withProvider(node: React.ReactNode) {
  return (
    <NextIntlClientProvider
      locale="ru"
      messages={unflattenMessages(ru as Record<string, string>)}
      timeZone="Asia/Bishkek"
    >
      {node}
    </NextIntlClientProvider>
  )
}

const empty: SuggestResponse = { products: [], categories: [], symptoms: [] }

const populated: SuggestResponse = {
  products: [
    {
      id: "019df06a-0000-0000-0000-000000000001",
      slug: "par-500-20",
      name: "Парацетамол 500 мг",
      price: "120.00",
      currency: "KGS",
      thumbnail_url: null,
    },
  ],
  categories: [{ id: 2, slug: "pain-relief", name: "Обезболивающие" }],
  symptoms: [{ id: 1, slug: "headache", name: "Головная боль" }],
}

describe("SearchSuggest", () => {
  it("renders nothing below the 2-char threshold", () => {
    const { container } = render(
      withProvider(<SearchSuggest locale="ru" query="x" data={empty} loading={false} />),
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders the empty-state copy when query is ≥2 chars but no results", () => {
    render(withProvider(<SearchSuggest locale="ru" query="zzz" data={empty} loading={false} />))
    expect(screen.getByText(/Ничего не найдено по запросу/)).toBeInTheDocument()
  })

  it("renders the loading hint when loading and no data yet", () => {
    render(withProvider(<SearchSuggest locale="ru" query="пар" data={empty} loading={true} />))
    expect(screen.getByText(/Поиск лекарств/)).toBeInTheDocument()
  })

  it("renders the three sections + footer link when populated", () => {
    render(withProvider(<SearchSuggest locale="ru" query="пар" data={populated} loading={false} />))
    expect(screen.getByText("Парацетамол 500 мг")).toBeInTheDocument()
    expect(screen.getByText("Обезболивающие")).toBeInTheDocument()
    expect(screen.getByText("Головная боль")).toBeInTheDocument()
    // "Results for «пар» →" footer link
    expect(screen.getByText(/Результаты по запросу «пар»/)).toBeInTheDocument()
  })

  it("each item has data-suggest-item for parent's keyboard navigation", () => {
    const { container } = render(
      withProvider(<SearchSuggest locale="ru" query="пар" data={populated} loading={false} />),
    )
    const items = container.querySelectorAll("[data-suggest-item]")
    // 1 product + 1 category + 1 symptom + 1 footer link = 4
    expect(items).toHaveLength(4)
  })

  it("product link routes to the localized PDP slug", () => {
    render(withProvider(<SearchSuggest locale="ru" query="пар" data={populated} loading={false} />))
    const productLink = screen.getByText("Парацетамол 500 мг").closest("a")
    expect(productLink).toHaveAttribute("href", "/ru/products/par-500-20")
  })
})
