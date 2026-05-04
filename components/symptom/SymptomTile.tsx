import { ActivityIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import type { Symptom } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// SymptomTile — DESIGN §11.3 + §12.4. Square tile with optional icon + name.
// Backend returns icon_url; if absent, fall back to a neutral pulse-icon
// rather than the brand-pill (the brand pill is for empty product images
// per DESIGN §8.4; a different missing-asset surface needs a different
// fallback to read correctly).

export interface SymptomTileProps {
  symptom: Symptom
  locale: string
}

export function SymptomTile({ symptom, locale }: SymptomTileProps) {
  const icon = symptom.icon_url

  return (
    <Link
      href={`/${locale}/symptoms/${symptom.slug}`}
      className={cn(
        "group relative flex aspect-square flex-col items-center justify-center gap-3 rounded-lg",
        "border-ink-100 bg-surface-card border p-4 text-center",
        "hover:border-brand-200 hover:bg-brand-50 transition-colors",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
      )}
    >
      <span
        className={cn(
          "inline-flex size-12 items-center justify-center rounded-full",
          "bg-brand-50 text-brand-600",
          "group-hover:bg-white",
        )}
      >
        {icon ? (
          <Image src={icon} alt="" width={28} height={28} className="size-7 object-contain" />
        ) : (
          <ActivityIcon aria-hidden="true" className="size-6" />
        )}
      </span>
      <span className="text-body-sm text-ink-900 font-medium">{symptom.name}</span>
    </Link>
  )
}
