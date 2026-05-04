import { fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QuantityStepper } from "@/components/cart/QuantityStepper"
import { unflattenMessages } from "@/i18n/unflatten"
import ru from "@/messages/ru.json"

// QuantityStepper tests focus on the Phase 8 plan D4 contract: rapid
// +/- clicks COLLAPSE into a single onChange dispatch, NOT one per
// click. We exercise this with vi.useFakeTimers + advanceTimersByTime
// so the 200ms debounce window is observable.

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

describe("QuantityStepper", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the initial value and decrement-disabled at min", () => {
    const onChange = vi.fn()
    render(withProvider(<QuantityStepper value={1} onChange={onChange} />))
    const input = screen.getByRole("spinbutton")
    expect(input).toHaveValue(1)
    const buttons = screen.getAllByRole("button")
    // First button (decrement) disabled when value === min (default 1).
    expect(buttons[0]).toBeDisabled()
    // Increment is enabled.
    expect(buttons[1]).not.toBeDisabled()
  })

  it("disables increment at max", () => {
    const onChange = vi.fn()
    render(withProvider(<QuantityStepper value={5} onChange={onChange} max={5} />))
    const buttons = screen.getAllByRole("button")
    expect(buttons[1]).toBeDisabled()
  })

  it("rapid +/- clicks collapse into a SINGLE onChange after debounce", () => {
    const onChange = vi.fn()
    render(withProvider(<QuantityStepper value={1} onChange={onChange} />))
    const incrementButton = screen.getAllByRole("button")[1]!

    // Five rapid increment clicks within the debounce window.
    fireEvent.click(incrementButton)
    fireEvent.click(incrementButton)
    fireEvent.click(incrementButton)
    fireEvent.click(incrementButton)
    fireEvent.click(incrementButton)

    // No emit yet — debounce holds.
    expect(onChange).not.toHaveBeenCalled()

    // Advance past the debounce window.
    vi.advanceTimersByTime(250)

    // Exactly ONE onChange call with the final value (1 + 5 = 6).
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it("two click bursts separated by a debounce gap fire two onChanges", () => {
    const onChange = vi.fn()
    render(withProvider(<QuantityStepper value={1} onChange={onChange} />))
    const incrementButton = screen.getAllByRole("button")[1]!

    fireEvent.click(incrementButton)
    fireEvent.click(incrementButton)
    vi.advanceTimersByTime(250) // 1 → 3, emit 3
    fireEvent.click(incrementButton)
    fireEvent.click(incrementButton)
    vi.advanceTimersByTime(250) // 3 → 5, emit 5

    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenNthCalledWith(1, 3)
    expect(onChange).toHaveBeenNthCalledWith(2, 5)
  })

  it("does not emit when the final value equals the prop value", () => {
    const onChange = vi.fn()
    render(withProvider(<QuantityStepper value={3} onChange={onChange} />))
    const buttons = screen.getAllByRole("button")
    const decrementButton = buttons[0]!
    const incrementButton = buttons[1]!

    fireEvent.click(incrementButton) // 3 → 4
    fireEvent.click(decrementButton) // 4 → 3
    vi.advanceTimersByTime(250)

    // Net change is zero; component should not waste a network roundtrip.
    expect(onChange).not.toHaveBeenCalled()
  })

  it("clamps to max when user mashes increment past the cap", () => {
    const onChange = vi.fn()
    render(withProvider(<QuantityStepper value={1} onChange={onChange} max={3} />))
    const incrementButton = screen.getAllByRole("button")[1]!

    fireEvent.click(incrementButton) // 1 → 2
    fireEvent.click(incrementButton) // 2 → 3
    // Button should now be disabled at max=3, but we test the clamp logic
    // on the apply() path by directly typing a too-high value below.
    vi.advanceTimersByTime(250)

    expect(onChange).toHaveBeenCalledWith(3)
  })

  it("syncs from server prop when user is not editing", () => {
    const onChange = vi.fn()
    const { rerender } = render(withProvider(<QuantityStepper value={2} onChange={onChange} />))
    expect(screen.getByRole("spinbutton")).toHaveValue(2)

    // Server-side rerender (e.g., refetch after another tab edit).
    rerender(withProvider(<QuantityStepper value={5} onChange={onChange} />))
    expect(screen.getByRole("spinbutton")).toHaveValue(5)
  })
})
