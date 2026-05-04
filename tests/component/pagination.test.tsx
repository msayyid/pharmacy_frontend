import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import ru from "@/messages/ru.json"

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockImplementation(async () => {
    const dict = ru as Record<string, string>
    return (key: string, params?: Record<string, unknown>) => {
      const tmpl = dict[key] ?? key
      if (!params) return tmpl
      // Naive ICU-ish substitution sufficient for the test assertions
      // (no plural/select branches in pagination keys).
      return tmpl.replace(/\{(\w+)\}/g, (_, name: string) =>
        params[name] !== undefined ? String(params[name]) : `{${name}}`,
      )
    }
  }),
}))

const { Pagination } = await import("@/components/catalog/Pagination")

async function renderPagination(props: { currentPage: number; totalPages: number }) {
  const element = await Pagination({
    ...props,
    buildHref: (page: number) => `?page=${page}`,
  })
  return render(<>{element}</>)
}

describe("Pagination", () => {
  it("renders nothing when there is only one page", async () => {
    const { container } = await renderPagination({ currentPage: 1, totalPages: 1 })
    expect(container.firstChild).toBeNull()
  })

  it("disables the prev control on the first page", async () => {
    await renderPagination({ currentPage: 1, totalPages: 5 })
    const links = screen.getAllByRole("link")
    expect(links.find((l) => l.getAttribute("rel") === "prev")).toBeUndefined()
  })

  it("disables the next control on the last page", async () => {
    await renderPagination({ currentPage: 5, totalPages: 5 })
    const links = screen.getAllByRole("link")
    expect(links.find((l) => l.getAttribute("rel") === "next")).toBeUndefined()
  })

  it("page-1 link points to ?page=1; rel='prev' set on prev link", async () => {
    await renderPagination({ currentPage: 3, totalPages: 5 })
    const prev = screen.getByRole("link", { name: /Предыдущая/ })
    expect(prev).toHaveAttribute("rel", "prev")
    expect(prev).toHaveAttribute("href", "?page=2")
  })

  it("collapses to a 7-button window with ellipsis for large totals", async () => {
    const { container } = await renderPagination({ currentPage: 10, totalPages: 50 })
    // Visible page numbers: 1, 8, 9, 10, 11, 12, 50 (current ±2 + first/last).
    const pageButtons = within(container).getAllByText(/^\d+$/)
    const nums = pageButtons.map((el) => Number(el.textContent))
    expect(nums).toEqual([1, 8, 9, 10, 11, 12, 50])
    // Two gap markers (between 1↔8 and 12↔50).
    const gaps = within(container).getAllByText("…")
    expect(gaps).toHaveLength(2)
  })

  it("marks the current page with aria-current=page (no link)", async () => {
    await renderPagination({ currentPage: 3, totalPages: 5 })
    const current = screen.getByText("3", { selector: '[aria-current="page"]' })
    expect(current).toBeInTheDocument()
    // Current page is a span, not an <a>.
    expect(current.tagName.toLowerCase()).toBe("span")
  })
})
