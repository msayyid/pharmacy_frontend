import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import NotFoundPage from "@/app/[locale]/not-found"
import ru from "@/messages/ru.json"

// Phase 11C. NotFoundPage is an RSC; it imports next-intl/server. We
// shim the two server helpers so the component renders synchronously
// in jsdom. The real wiring is covered in E2E (a hard 404 page render).

vi.mock("next-intl/server", () => ({
  getLocale: async () => "ru",
  getTranslations: async () => (key: string) => (ru as Record<string, string>)[key] ?? key,
}))

describe("NotFoundPage", () => {
  it("renders the localized 404 title + CTA back to catalog + support phone", async () => {
    const ui = await NotFoundPage()
    render(ui)

    expect(screen.getByText(/Страница не найдена/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Перейти к покупкам/ })).toHaveAttribute(
      "href",
      "/ru/categories",
    )
    // Support phone surface (sacred-invariant #4).
    const phoneLinks = screen.getAllByRole("link", { name: /\+996/ })
    expect(phoneLinks.length).toBeGreaterThanOrEqual(1)
  })

  it("body copy explains the page may have been moved or mistyped", async () => {
    const ui = await NotFoundPage()
    render(ui)
    expect(screen.getByText(/была перемещена/)).toBeInTheDocument()
  })
})
