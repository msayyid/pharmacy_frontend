"use client"

import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import Image from "next/image"
import * as React from "react"

import { ProductImage } from "@/components/product/ProductImage"
import type { ProductImage as ProductImageData } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// ImageCarousel — DESIGN §12.6 + §8.3 + §16. Square aspect (1:1) main pane
// with touch-swipe (mobile) + prev/next buttons (desktop) + thumbnail strip
// (desktop only). LCP optimization: first image renders with `priority`,
// subsequent are lazy.
//
// Two Embla instances per the standard "main + thumbs" pattern: the
// thumbnail strip drives the main carousel via .scrollTo, and the main
// carousel echoes its selected index back so the thumb strip can highlight
// the active thumbnail. Both instances share the same image array.
//
// Empty state: when `images` is empty, falls back to <ProductImage src={null}>
// which renders the brand-pill SVG (DESIGN §8.4). Single-image state: renders
// just the image without any carousel controls — a single dot indicator and
// no thumb strip would feel like over-investment.

export interface ImageCarouselProps {
  images: ProductImageData[]
  alt: string
  className?: string
}

export function ImageCarousel({ images, alt, className }: ImageCarouselProps) {
  const hasImages = images.length > 0
  const isMulti = images.length > 1

  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({
    loop: false,
    skipSnaps: false,
  })
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  })
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const onThumbClick = React.useCallback(
    (index: number) => {
      if (!emblaMainApi || !emblaThumbsApi) return
      emblaMainApi.scrollTo(index)
    },
    [emblaMainApi, emblaThumbsApi],
  )

  React.useEffect(() => {
    if (!emblaMainApi) return
    const handler = () => {
      const index = emblaMainApi.selectedScrollSnap()
      setSelectedIndex(index)
      emblaThumbsApi?.scrollTo(index)
    }
    // Read initial state via the next microtask so we don't synchronously
    // setState during the effect body (eslint react-hooks rule).
    queueMicrotask(handler)
    emblaMainApi.on("select", handler).on("reInit", handler)
    return () => {
      emblaMainApi.off("select", handler).off("reInit", handler)
    }
  }, [emblaMainApi, emblaThumbsApi])

  if (!hasImages) {
    return (
      <div className={cn("w-full", className)} data-slot="image-carousel-empty">
        <ProductImage src={null} alt={alt} priority />
      </div>
    )
  }

  if (!isMulti) {
    const only = images[0]!
    return (
      <div className={cn("w-full", className)} data-slot="image-carousel-single">
        <ProductImage src={only.large_url ?? only.url} alt={only.alt_text ?? alt} priority />
      </div>
    )
  }

  return (
    <div className={cn("flex w-full flex-col gap-3", className)} data-slot="image-carousel">
      <div className="relative">
        <div className="overflow-hidden rounded-md" ref={emblaMainRef}>
          <div className="flex">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="bg-brand-50 relative aspect-square min-w-0 flex-[0_0_100%]"
              >
                <Image
                  src={image.large_url ?? image.url}
                  alt={image.alt_text ?? alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  {...(index === 0 ? { priority: true } : {})}
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label="Previous image"
          onClick={() => emblaMainApi?.scrollPrev()}
          className={cn(
            "absolute top-1/2 left-2 -translate-y-1/2",
            "hidden size-10 items-center justify-center rounded-full md:inline-flex",
            "border-ink-100 bg-surface-card text-ink-700 shadow-elev1 border",
            "hover:bg-ink-50",
            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          )}
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Next image"
          onClick={() => emblaMainApi?.scrollNext()}
          className={cn(
            "absolute top-1/2 right-2 -translate-y-1/2",
            "hidden size-10 items-center justify-center rounded-full md:inline-flex",
            "border-ink-100 bg-surface-card text-ink-700 shadow-elev1 border",
            "hover:bg-ink-50",
            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
          )}
        >
          <ChevronRightIcon aria-hidden="true" className="size-5" />
        </button>

        <ol
          aria-hidden="true"
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden"
        >
          {images.map((image, index) => (
            <li key={image.id}>
              <span
                className={cn(
                  "inline-block size-2 rounded-full",
                  index === selectedIndex ? "bg-ink-900" : "bg-ink-300",
                )}
              />
            </li>
          ))}
        </ol>
      </div>

      <div className="hidden md:block">
        <div className="overflow-hidden" ref={emblaThumbsRef}>
          <ol className="flex gap-2">
            {images.map((image, index) => (
              <li key={image.id} className="min-w-0 flex-[0_0_72px]">
                <button
                  type="button"
                  onClick={() => onThumbClick(index)}
                  aria-label={`Image ${index + 1}`}
                  aria-current={index === selectedIndex ? "true" : undefined}
                  className={cn(
                    "relative aspect-square w-full overflow-hidden rounded-md",
                    "border-2 transition-colors",
                    index === selectedIndex ? "border-brand-500" : "border-transparent",
                    "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                  )}
                >
                  <Image
                    src={image.thumbnail_url ?? image.url}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
