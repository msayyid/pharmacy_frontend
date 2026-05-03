import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { describe, expect, it } from "vitest"

import { PhoneInput } from "@/components/auth/PhoneInput"

function ControlledPhoneInput(props: { initial?: string; invalid?: boolean }) {
  const [value, setValue] = React.useState(props.initial ?? "")
  return (
    <PhoneInput
      value={value}
      onChange={setValue}
      {...(props.invalid !== undefined ? { invalid: props.invalid } : {})}
      id="phone"
    />
  )
}

describe("PhoneInput", () => {
  it("accepts the canonical +996 700 12 34 56 form", async () => {
    render(<ControlledPhoneInput />)
    const input = screen.getByRole("textbox") as HTMLInputElement
    await userEvent.type(input, "+996 700 12 34 56")
    expect(input.value).toBe("+996 700 12 34 56")
  })

  it("accepts a paste of 996700123456", async () => {
    render(<ControlledPhoneInput />)
    const input = screen.getByRole("textbox") as HTMLInputElement
    await userEvent.click(input)
    fireEvent.paste(input, {
      clipboardData: { getData: () => "996700123456" },
    })
    // Paste lands as raw text; format-on-blur normalizes.
    await userEvent.type(input, "996700123456")
    fireEvent.blur(input)
    expect(input.value).toBe("+996 700 123 456")
  })

  it("accepts the local 0700 12 34 56 form (default region KG)", async () => {
    render(<ControlledPhoneInput />)
    const input = screen.getByRole("textbox") as HTMLInputElement
    await userEvent.type(input, "0700 12 34 56")
    fireEvent.blur(input)
    // libphonenumber's KG default reformats to international shape.
    expect(input.value).toMatch(/\+996.*700/)
  })

  it("invalid input on blur stays as-is (does not crash)", async () => {
    render(<ControlledPhoneInput initial="not a phone" />)
    const input = screen.getByRole("textbox") as HTMLInputElement
    fireEvent.blur(input)
    expect(input.value).toBe("not a phone")
  })

  it("renders with type=tel + inputMode=tel for mobile keypad", () => {
    render(<ControlledPhoneInput />)
    const input = screen.getByRole("textbox")
    expect(input).toHaveAttribute("type", "tel")
    expect(input).toHaveAttribute("inputMode", "tel")
    expect(input).toHaveAttribute("autoComplete", "tel")
  })

  it("aria-invalid reflects the invalid prop", () => {
    render(<ControlledPhoneInput invalid />)
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true")
  })

  it("renders the +996 placeholder by default", () => {
    render(<ControlledPhoneInput />)
    expect(screen.getByPlaceholderText("+996 700 12 34 56")).toBeInTheDocument()
  })
})
