import type { Metadata } from "next"
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { BRAND } from "@/lib/brand"
import "./globals.css"

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: `${BRAND.name} — foundation phase`,
  description: `${BRAND.name} storefront foundation phase. See BUILD_PROGRESS.md for the active phase.`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable} ${dmSerif.variable}`}>
      <body>
        <TooltipPrimitive.Provider>{children}</TooltipPrimitive.Provider>
      </body>
    </html>
  )
}
