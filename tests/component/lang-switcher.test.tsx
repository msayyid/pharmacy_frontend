import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { LangSwitcher } from "@/components/i18n/LangSwitcher"

// next/navigation is a server-only-flavored module in Next 16; tests need a
// minimal mock that returns the helpers LangSwitcher consumes.
const replaceMock = vi.fn()
const pushMock = vi.fn()
let pathnameValue = "/ru"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => pathnameValue,
}))

interface WrapperOptions {
  locale: "ru" | "ky" | "en"
  children: ReactNode
}

function Wrapper({ locale, children }: WrapperOptions) {
  return (
    <NextIntlClientProvider locale={locale} messages={{}}>
      {children}
    </NextIntlClientProvider>
  )
}

describe("LangSwitcher", () => {
  afterEach(() => {
    replaceMock.mockClear()
    pushMock.mockClear()
    pathnameValue = "/ru"
  })

  it("renders three pills (RU / KY / EN)", () => {
    render(
      <Wrapper locale="ru">
        <LangSwitcher />
      </Wrapper>,
    )
    expect(screen.getByRole("button", { name: "RU" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "KY" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument()
  })

  it("marks the active locale with aria-current and disables it", () => {
    render(
      <Wrapper locale="ky">
        <LangSwitcher />
      </Wrapper>,
    )
    const ky = screen.getByRole("button", { name: "KY" })
    expect(ky).toHaveAttribute("aria-current", "true")
    expect(ky).toBeDisabled()

    const ru = screen.getByRole("button", { name: "RU" })
    expect(ru).not.toHaveAttribute("aria-current")
    expect(ru).not.toBeDisabled()
  })

  it("clicking a different locale router.replace's with the swapped prefix", async () => {
    pathnameValue = "/ru/products/paracetamol"
    render(
      <Wrapper locale="ru">
        <LangSwitcher />
      </Wrapper>,
    )
    await userEvent.click(screen.getByRole("button", { name: "EN" }))
    expect(replaceMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith("/en/products/paracetamol")
  })

  it("swapping from a bare /ru lands on /en (not /en/)", async () => {
    pathnameValue = "/ru"
    render(
      <Wrapper locale="ru">
        <LangSwitcher />
      </Wrapper>,
    )
    await userEvent.click(screen.getByRole("button", { name: "EN" }))
    expect(replaceMock).toHaveBeenCalledWith("/en")
  })

  it("clicking the active locale is a no-op", async () => {
    render(
      <Wrapper locale="ru">
        <LangSwitcher />
      </Wrapper>,
    )
    await userEvent.click(screen.getByRole("button", { name: "RU" }))
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("preserves nested paths with multiple segments", async () => {
    pathnameValue = "/ky/account/addresses"
    render(
      <Wrapper locale="ky">
        <LangSwitcher />
      </Wrapper>,
    )
    await userEvent.click(screen.getByRole("button", { name: "RU" }))
    expect(replaceMock).toHaveBeenCalledWith("/ru/account/addresses")
  })
})
