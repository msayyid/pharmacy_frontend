import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

describe("Input", () => {
  it("renders with placeholder + accepts user input", async () => {
    render(<Input placeholder="+996 700 12 34 56" />)
    const input = screen.getByPlaceholderText("+996 700 12 34 56")
    expect(input).toBeInTheDocument()
    await userEvent.type(input, "996700123456")
    expect(input).toHaveValue("996700123456")
  })

  it("Cyrillic input is preserved verbatim", async () => {
    render(<Input placeholder="Имя" />)
    const input = screen.getByPlaceholderText("Имя")
    await userEvent.type(input, "Айжана")
    expect(input).toHaveValue("Айжана")
  })

  it("links to a Label via htmlFor", () => {
    render(
      <>
        <Label htmlFor="phone">Телефон</Label>
        <Input id="phone" />
      </>,
    )
    const input = screen.getByLabelText("Телефон")
    expect(input).toBeInTheDocument()
  })

  it("error state via aria-invalid is exposed on the element", () => {
    render(<Input aria-invalid="true" defaultValue="0700" />)
    const input = screen.getByDisplayValue("0700")
    expect(input).toHaveAttribute("aria-invalid", "true")
  })

  it("disabled prop disables typing", async () => {
    render(<Input disabled placeholder="x" />)
    const input = screen.getByPlaceholderText("x")
    expect(input).toBeDisabled()
    await userEvent.type(input, "should-not-land")
    expect(input).toHaveValue("")
  })

  it("type=tel is preserved (used by the phone input pattern)", () => {
    render(<Input type="tel" defaultValue="+996" />)
    const input = screen.getByDisplayValue("+996")
    expect(input).toHaveAttribute("type", "tel")
  })
})
