import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Storefront — foundation phase",
  description: "Storefront foundation phase. See BUILD_PROGRESS.md for the active phase.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
