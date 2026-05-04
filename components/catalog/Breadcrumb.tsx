import { ChevronRightIcon, HomeIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

import type { CategoryDetail } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// Breadcrumb on category detail pages — DESIGN §12.5. Walks the
// `breadcrumb` array the backend returns on CategoryDetail, prefixed by
// the locale's home and the categories index. Last item is rendered as
// plain text (current page) without a link, with aria-current="page".

export interface BreadcrumbProps {
  locale: string
  trail: CategoryDetail["breadcrumb"]
}

export async function Breadcrumb({ locale, trail }: BreadcrumbProps) {
  const t = await getTranslations()
  const safeTrail = trail ?? []

  const items: Array<{ href: string | null; label: string; isCurrent: boolean }> = [
    {
      href: `/${locale}`,
      label: t("nav.home"),
      isCurrent: false,
    },
    {
      href: `/${locale}/categories`,
      label: t("category.breadcrumb_root"),
      isCurrent: false,
    },
    ...safeTrail.map((item, index) => ({
      href: index === safeTrail.length - 1 ? null : `/${locale}/categories/${item.slug}`,
      label: item.name,
      isCurrent: index === safeTrail.length - 1,
    })),
  ]

  return (
    <nav aria-label={t("category.breadcrumb_root")} data-slot="breadcrumb" className="text-body-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index === 0 ? <HomeIcon aria-hidden="true" className="text-ink-500 size-3.5" /> : null}
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "text-ink-600 hover:text-ink-900",
                  "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current={item.isCurrent ? "page" : undefined} className="text-ink-900">
                {item.label}
              </span>
            )}
            {index < items.length - 1 ? (
              <ChevronRightIcon aria-hidden="true" className="text-ink-400 size-3.5 flex-none" />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}
