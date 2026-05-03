import { notFound } from "next/navigation"
import { KitchenSink } from "./kitchen-sink"

// Dev-only design-system showcase. Gated by NEXT_PUBLIC_ENV: returns 404 in
// production builds. Used during Phase 2+ for visual review and as the target
// of the Playwright kitchen-sink visual smoke test.
export default function KitchenSinkPage() {
  if (process.env.NEXT_PUBLIC_ENV === "production") {
    notFound()
  }
  return <KitchenSink />
}
