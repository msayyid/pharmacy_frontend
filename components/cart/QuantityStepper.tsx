"use client"

import { MinusIcon, PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import * as React from "react"

import { cn } from "@/lib/utils"

// QuantityStepper — DESIGN §13.6 + Phase 8 plan D4.
//
// Critical semantics: rapid +/- clicks COLLAPSE into a single onChange
// dispatch, NOT one per click. User clicks +,+,+,+,+ in 600ms → local
// state advances optimistically through 6,7,8,9,10 → debounce holds
// 200ms after the LAST click → fires ONE onChange(10). The parent
// (CartLine → useUpdateCartItem) then sends ONE PATCH to the backend.
//
// This avoids both UI flicker (qty number jumping with each server
// roundtrip) AND server-side spam (5 PATCHes for what's logically a
// single user action). The mutation queue per item ID in
// lib/cart/mutations.ts is the safety net for the cross-pause case
// (user clicks, waits 250ms, clicks again — two PATCHes, dispatched
// in order).
//
// The decrement button is disabled at `min` (default 1) — DESIGN §13.6:
// "Disable decrement at 1; delete is separate action." Increment is
// disabled at `max` (max_per_order, when known).

const DEBOUNCE_MS = 200

export interface QuantityStepperProps {
  /** The server-side authoritative quantity for this line. The component
   *  syncs local state from this prop unless the user is mid-edit. */
  value: number
  /** Fired ONCE per debounce window with the final quantity. */
  onChange: (next: number) => void
  /** Backend max_per_order cap, when known. Undefined = no cap surfaced. */
  max?: number
  /** Defaults to 1 per DESIGN §13.6. */
  min?: number
  disabled?: boolean
  className?: string
}

export function QuantityStepper({
  value,
  onChange,
  max,
  min = 1,
  disabled,
  className,
}: QuantityStepperProps) {
  const t = useTranslations()
  const [local, setLocal] = React.useState(value)
  const localRef = React.useRef(value)
  const isUserEditingRef = React.useRef(false)
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local from server prop when the user isn't actively editing.
  // Covers refetch-after-mutation (server clamps to max, we converge).
  React.useEffect(() => {
    if (!isUserEditingRef.current) {
      localRef.current = value
      setLocal(value)
    }
  }, [value])

  // Cleanup the timer on unmount so we don't leak emits.
  React.useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const scheduleEmit = React.useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      isUserEditingRef.current = false
      if (localRef.current !== value) {
        onChange(localRef.current)
      }
    }, DEBOUNCE_MS)
  }, [onChange, value])

  const apply = React.useCallback(
    (next: number) => {
      const clamped = Math.max(min, max !== undefined ? Math.min(next, max) : next)
      isUserEditingRef.current = true
      localRef.current = clamped
      setLocal(clamped)
      scheduleEmit()
    },
    [min, max, scheduleEmit],
  )

  const handleIncrement = () => apply(localRef.current + 1)
  const handleDecrement = () => apply(localRef.current - 1)

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.target.value, 10)
    if (!Number.isFinite(parsed)) return
    apply(parsed)
  }

  const decrementDisabled = disabled || local <= min
  const incrementDisabled = disabled || (max !== undefined && local >= max)

  return (
    <div
      data-slot="quantity-stepper"
      className={cn("border-ink-200 inline-flex items-center gap-1 rounded-md border", className)}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={decrementDisabled}
        aria-label={t("cart.line.update_qty")}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-l-md",
          "text-ink-700 hover:bg-ink-50",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        <MinusIcon aria-hidden="true" className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={local}
        onChange={handleInput}
        disabled={disabled}
        min={min}
        {...(max !== undefined ? { max } : {})}
        aria-label={t("cart.line.update_qty")}
        className={cn(
          "text-body-sm text-ink-900 h-9 w-12 bg-transparent text-center font-medium tabular-nums",
          "outline-none",
          // Hide spin buttons (DESIGN §13.6: visible buttons only).
          "[appearance:textfield]",
          "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={incrementDisabled}
        aria-label={t("cart.line.update_qty")}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-r-md",
          "text-ink-700 hover:bg-ink-50",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        <PlusIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
