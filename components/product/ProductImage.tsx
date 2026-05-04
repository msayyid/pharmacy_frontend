import { PillIcon } from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"

// ProductImage — DESIGN §8.4 + FRONTEND §16. Square aspect ratio, takes
// the full container width via `fill`. When `src` is null/undefined, falls
// back to the brand-pill PillIcon over a brand-50 wash.
//
// Real image hosts come from `next.config.ts > images.remotePatterns`,
// which is wired against `NEXT_PUBLIC_API_URL/static/images/**` (backend
// MVP local-disk store) plus production hostnames added at deploy time.
// Until backend Q15 (Cloudflare R2) closes, every product still has
// `thumbnail_url=null` in the seed and the fallback is what users see.

export interface ProductImageProps {
  /** Image URL or null/undefined to render the brand-pill fallback. */
  src: string | null | undefined
  alt: string
  sizes?: string
  className?: string
  priority?: boolean
}

const DEFAULT_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"

export function ProductImage({
  src,
  alt,
  sizes = DEFAULT_SIZES,
  className,
  priority,
}: ProductImageProps) {
  return (
    <div
      data-slot="product-image"
      className={cn(
        "relative aspect-square overflow-hidden rounded-md",
        "bg-brand-50 flex items-center justify-center",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          {...(priority ? { priority: true } : {})}
          className="object-cover"
        />
      ) : (
        <PillIcon aria-hidden="true" className="text-brand-300 size-12" />
      )}
    </div>
  )
}
