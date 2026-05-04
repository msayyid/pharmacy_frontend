import { Skeleton } from "@/components/ui/skeleton"

// PDP loading skeleton. Phase 11C. Mirrors the above-fold layout shape so
// CLS is minimized: square image carousel + name + price + CTA on the
// right column, description tabs below. Below-fold substitutes block uses
// its own SubstitutesSkeleton (Phase 7 7C).

export default function PdpLoading() {
  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-10 px-4 py-8 md:px-6 md:py-12">
      <section className="grid gap-6 md:grid-cols-2 md:gap-10">
        <Skeleton className="aspect-square w-full" />

        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-3">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-32" />
          </div>
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-11 w-full max-w-xs" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-7 w-40" />
        <div className="grid grid-cols-1 gap-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </section>
    </main>
  )
}
