import { PhoneIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BRAND } from "@/lib/brand"
import { cn } from "@/lib/utils"

// DESIGN §11.3 + §15.5 — PhoneCallButton
// Tap-to-call CTA pointing at BRAND.supportPhone. Renders visually as a
// Button but the underlying element is an <a href="tel:..."> so iOS / Android
// pick up the dial intent natively (DESIGN §15.5: "the person on the other
// end" rule — every error state offers a phone tap-away).
//
// This skeleton renders the icon + an optional label. Phase 4 will pass the
// localized label via t("header.phone_support"). Phase 12 swaps the BRAND
// placeholder phone for the real support number.

export interface PhoneCallButtonProps {
  label?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg"
  className?: string
}

export function PhoneCallButton({
  label,
  variant = "outline",
  size = "default",
  className,
}: PhoneCallButtonProps) {
  // Strip whitespace for the tel: URI; libphonenumber-js handles real
  // normalization in Phase 5 once we have the real number.
  const telHref = `tel:${BRAND.supportPhone.replace(/\s+/g, "")}`

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      data-slot="phone-call-button"
    >
      <a href={telHref} aria-label={label ?? BRAND.supportPhone}>
        <PhoneIcon aria-hidden="true" />
        {label ? <span>{label}</span> : null}
      </a>
    </Button>
  )
}
