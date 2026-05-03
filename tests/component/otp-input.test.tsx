import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import { OtpInput } from "@/components/auth/OtpInput"

interface HarnessProps {
  initial?: string
  onComplete?: (code: string) => void
}

function Harness({ initial = "", onComplete }: HarnessProps) {
  const [value, setValue] = React.useState(initial)
  return (
    <OtpInput
      value={value}
      onChange={setValue}
      {...(onComplete ? { onComplete } : {})}
      ariaLabel="OTP code"
    />
  )
}

describe("OtpInput", () => {
  it("renders 6 single-digit inputs by default", () => {
    render(<Harness />)
    expect(screen.getAllByRole("textbox")).toHaveLength(6)
  })

  it("auto-advances focus after each digit", async () => {
    render(<Harness />)
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[]

    await userEvent.click(inputs[0]!)
    await userEvent.keyboard("1")
    expect(document.activeElement).toBe(inputs[1])
    await userEvent.keyboard("2")
    expect(document.activeElement).toBe(inputs[2])
  })

  it("backspace on an empty cell jumps to the previous cell", async () => {
    render(<Harness initial="12" />)
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[]

    // Click into cell #2 (which is empty since initial only fills #0 and #1).
    await userEvent.click(inputs[2]!)
    await userEvent.keyboard("{Backspace}")
    expect(document.activeElement).toBe(inputs[1])
  })

  it("ArrowLeft / ArrowRight move focus", async () => {
    render(<Harness initial="12345" />)
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[]

    await userEvent.click(inputs[3]!)
    await userEvent.keyboard("{ArrowLeft}")
    expect(document.activeElement).toBe(inputs[2])
    await userEvent.keyboard("{ArrowRight}{ArrowRight}")
    expect(document.activeElement).toBe(inputs[4])
  })

  it("paste of 123456 fills all six cells", async () => {
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[]

    fireEvent.paste(inputs[0]!, {
      clipboardData: { getData: () => "123456" },
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    // Read the shared parent state via input values.
    expect(inputs[0]!.value).toBe("1")
    expect(inputs[5]!.value).toBe("6")
    expect(onComplete).toHaveBeenCalledWith("123456")
  })

  it("paste of 'abc1234567xyz' takes only the first 6 digits", async () => {
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[]

    fireEvent.paste(inputs[0]!, {
      clipboardData: { getData: () => "abc1234567xyz" },
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(inputs[0]!.value).toBe("1")
    expect(inputs[5]!.value).toBe("6")
    expect(onComplete).toHaveBeenCalledWith("123456")
  })

  it("onComplete fires exactly once when a full code is entered", async () => {
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)

    fireEvent.paste(screen.getAllByRole("textbox")[0]!, {
      clipboardData: { getData: () => "111222" },
    })

    // Wait for the effect to fire.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it("onComplete fires again after the value drops below 6 then refills", async () => {
    const onComplete = vi.fn()

    function ResetHarness() {
      const [value, setValue] = React.useState("")
      return (
        <>
          <OtpInput value={value} onChange={setValue} onComplete={onComplete} />
          <button type="button" onClick={() => setValue("")}>
            Clear
          </button>
        </>
      )
    }

    render(<ResetHarness />)

    fireEvent.paste(screen.getAllByRole("textbox")[0]!, {
      clipboardData: { getData: () => "111222" },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onComplete).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    fireEvent.paste(screen.getAllByRole("textbox")[0]!, {
      clipboardData: { getData: () => "333444" },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onComplete).toHaveBeenCalledTimes(2)
    expect(onComplete).toHaveBeenLastCalledWith("333444")
  })

  it("non-numeric typed input is rejected (silently dropped)", async () => {
    render(<Harness />)
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[]
    await userEvent.click(inputs[0]!)
    await userEvent.keyboard("a")
    expect(inputs[0]!.value).toBe("")
  })
})
