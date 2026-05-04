import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SymptomTile } from "@/components/symptom/SymptomTile"
import type { Symptom } from "@/lib/api/types"

const baseSymptom: Symptom = {
  id: 1,
  slug: "headache",
  name: "Головная боль",
  icon_url: null,
  sort_order: 10,
}

describe("SymptomTile", () => {
  it("renders the symptom name + links to /[locale]/symptoms/[slug]", () => {
    render(<SymptomTile symptom={baseSymptom} locale="ru" />)
    const link = screen.getByRole("link", { name: /Головная боль/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/ru/symptoms/headache")
  })

  it("falls back to ActivityIcon when icon_url is null (no <img>)", () => {
    const { container } = render(<SymptomTile symptom={baseSymptom} locale="ru" />)
    expect(container.querySelector("img")).toBeNull()
  })

  it("renders an <img> when icon_url is provided", () => {
    const { container } = render(
      <SymptomTile
        symptom={{ ...baseSymptom, icon_url: "https://cdn.example.com/icon.svg" }}
        locale="ru"
      />,
    )
    // next/image renders <img> in test environments after hydration; we just
    // assert the component branched into the icon-with-image path.
    const img = container.querySelector("img")
    expect(img).not.toBeNull()
  })

  it("passes locale through to the href prefix", () => {
    render(<SymptomTile symptom={baseSymptom} locale="ky" />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/ky/symptoms/headache")
  })
})
