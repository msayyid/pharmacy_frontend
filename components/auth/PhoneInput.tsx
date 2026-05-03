"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { formatPhoneDisplay } from "@/lib/format/phone"
import { cn } from "@/lib/utils"

// PhoneInput — RHF-friendly controlled input for KG mobile numbers.
// Per DESIGN §13.3:
//   - +996 prefix as placeholder (NOT prefilled — accept paste of any of
//     +996 700 12 34 56 / 0700 12 34 56 / 996700123456)
//   - Format on blur via formatPhoneDisplay (libphonenumber-js, KG default)
//   - Submit value normalization to E.164 happens at the form layer using
//     formatPhoneE164 from lib/format/phone.ts.
//
// Pattern: pure controlled component. Accepts value/onChange/onBlur per
// react-hook-form's Controller contract; the parent owns the state.

export interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  id?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  placeholder?: string
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onChange, onBlur, id, disabled, invalid, className, placeholder },
  ref,
) {
  function handleBlur() {
    // Format-on-blur: if the value parses to a valid KG mobile, render it
    // as the canonical "+996 700 12 34 56" form so the user sees what will
    // be sent to the backend.
    const formatted = formatPhoneDisplay(value)
    if (formatted !== value) onChange(formatted)
    onBlur?.()
  }

  return (
    <Input
      ref={ref}
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder ?? "+996 700 12 34 56"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={cn("tabular-nums", className)}
      data-slot="phone-input"
    />
  )
})
