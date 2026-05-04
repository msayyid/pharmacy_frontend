import { Skeleton } from "@/components/ui/skeleton"

// Search results loading skeleton. Phase 11C. Catalog-grid shape.

export default function SearchLoading() {
  return (
    <main className="mx-auto flex max-w-screen-xl flex-col gap-6 px-4 py-10 md:px-6 md:py-14">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/4" />
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full" />
        ))}
      </div>
    </main>
  )
}
