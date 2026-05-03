import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"

describe("Button", () => {
  it("renders the default variant + label", () => {
    render(<Button>Подтвердить</Button>)
    const btn = screen.getByRole("button", { name: /подтвердить/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute("data-variant", "default")
  })

  it.each(["default", "secondary", "outline", "ghost", "destructive", "link"] as const)(
    "renders variant=%s",
    (variant) => {
      render(<Button variant={variant}>v</Button>)
      expect(screen.getByRole("button")).toHaveAttribute("data-variant", variant)
    },
  )

  it.each(["xs", "sm", "default", "lg"] as const)("renders size=%s", (size) => {
    render(<Button size={size}>s</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("data-size", size)
  })

  it("disabled prop disables the button + does not fire clicks", async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    )
    const btn = screen.getByRole("button")
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("loading prop disables the button, sets aria-busy + data-loading, and renders a spinner", () => {
    render(<Button loading>Загрузка</Button>)
    const btn = screen.getByRole("button")
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute("aria-busy", "true")
    expect(btn).toHaveAttribute("data-loading", "true")
    // The spinner is the lucide Loader2Icon — an inline svg with aria-hidden.
    expect(btn.querySelector("svg")).not.toBeNull()
  })

  it("loading prop swallows clicks", async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Загрузка
      </Button>,
    )
    await userEvent.click(screen.getByRole("button"))
    expect(onClick).not.toHaveBeenCalled()
  })

  it("non-loading button fires clicks", async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Готово</Button>)
    await userEvent.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("focus ring class is present on the button (DESIGN §11.4)", () => {
    render(<Button>Фокус</Button>)
    const btn = screen.getByRole("button")
    expect(btn.className).toMatch(/focus-visible:ring-/)
  })
})
