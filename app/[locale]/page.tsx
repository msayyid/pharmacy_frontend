import { BRAND } from "@/lib/brand"

export const APP_VERSION = "0.1.0"

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-h1 text-ink-900 font-semibold">{BRAND.name}</h1>
      <p className="text-body text-ink-600 mt-2">
        Foundation phase complete — see BUILD_PROGRESS.md
      </p>
      <p className="text-caption text-ink-500 mt-4">Build version {APP_VERSION}</p>
    </main>
  )
}
