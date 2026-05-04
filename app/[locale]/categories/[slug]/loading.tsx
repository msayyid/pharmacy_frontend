import { Skeleton } from "@/components/ui/skeleton"

// Category detail loading skeleton. Phase 11C. Mirrors the catalog-grid
// layout shape (breadcrumb + heading + sort-row + 4-up grid).

export default function CategoryDetailLoading() {
  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
      <Skeleton className="h-4 w-1/3" />
      <header className="flex flex-col gap-2">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
      </header>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full" />
        ))}
      </div>
    </main>
  )
}
