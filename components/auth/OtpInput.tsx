"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// OtpInput — 6-box single-digit input.
// Per DESIGN §13.5 + spec §5.4.5:
//   - Auto-advance on each digit
//   - Backspace-to-prev when current cell empty
//   - Paste of "123456" fills all six cells
//   - inputMode="numeric" + pattern for mobile numeric keypad
//   - onComplete fires once when all six are filled
//
// The parent owns the value (string of length 0-6); we render boxes off it.

export interface OtpInputProps {
  value: string
  onChange: (next: string) => void
  onComplete?: (code: string) => void
  disabled?: boolean
  invalid?: boolean
  length?: number
  className?: string
  ariaLabel?: string
}

const DEFAULT_LENGTH = 6

function sanitizeDigits(input: string, length: number): string {
  return input.replace(/\D/g, "").slice(0, length)
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  length = DEFAULT_LENGTH,
  className,
  ariaLabel,
}: OtpInputProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([])
  const lastFiredCompleteRef = React.useRef<string | null>(null)

  // Fire onComplete exactly once per full code (until value drops back below
  // length, at which point the next fill fires again).
  React.useEffect(() => {
    if (value.length === length && value !== lastFiredCompleteRef.current) {
      lastFiredCompleteRef.current = value
      onComplete?.(value)
    } else if (value.length < length) {
      lastFiredCompleteRef.current = null
    }
  }, [value, length, onComplete])

  const cells = React.useMemo(() => {
    const out: string[] = []
    for (let i = 0; i < length; i += 1) {
      out.push(value[i] ?? "")
    }
    return out
  }, [value, length])

  function focusCell(index: number) {
    const el = refs.current[index]
    if (el) {
      el.focus()
      el.select()
    }
  }

  function setValueAt(index: number, digit: string) {
    const arr = cells.slice()
    arr[index] = digit
    const next = arr.join("")
    onChange(next.replace(/\s/g, ""))
  }

  function handleChange(index: number, raw: string) {
    const digits = sanitizeDigits(raw, length)
    if (digits.length === 0) {
      setValueAt(index, "")
      return
    }
    if (digits.length === 1) {
      setValueAt(index, digits)
      // auto-advance (only if there's a next cell)
      if (index < length - 1) {
        setTimeout(() => focusCell(index + 1), 0)
      }
      return
    }
    // Multi-character input (paste, autofill) — fill from this cell rightward.
    const arr = cells.slice()
    for (let i = 0; i < digits.length && index + i < length; i += 1) {
      arr[index + i] = digits[i] ?? ""
    }
    const next = arr.join("")
    onChange(next.replace(/\s/g, ""))
    const targetIndex = Math.min(index + digits.length, length - 1)
    setTimeout(() => focusCell(targetIndex), 0)
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && cells[index] === "" && index > 0) {
      event.preventDefault()
      setValueAt(index - 1, "")
      focusCell(index - 1)
      return
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault()
      focusCell(index - 1)
      return
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault()
      focusCell(index + 1)
    }
  }

  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = sanitizeDigits(event.clipboardData.getData("text"), length)
    if (pasted.length === 0) return
    event.preventDefault()
    const arr = cells.slice()
    for (let i = 0; i < pasted.length && index + i < length; i += 1) {
      arr[index + i] = pasted[i] ?? ""
    }
    onChange(arr.join("").replace(/\s/g, ""))
    const targetIndex = Math.min(index + pasted.length, length - 1)
    setTimeout(() => focusCell(targetIndex), 0)
  }

  return (
    <div
      data-slot="otp-input"
      role="group"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-2", className)}
    >
      {cells.map((cell, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          pattern="[0-9]"
          value={cell}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.currentTarget.select()}
          className={cn(
            "bg-surface-card text-h3 size-12 rounded-md border text-center font-semibold tabular-nums",
            "focus-visible:border-ring focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            invalid ? "border-danger-500" : "border-ink-200",
          )}
        />
      ))}
    </div>
  )
}
