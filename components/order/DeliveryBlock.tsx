"use client"

import { useTranslations } from "next-intl"

import type { OrderRead } from "@/lib/api/types"
import { formatPhoneDisplay } from "@/lib/format/phone"

// Delivery / recipient block on the order detail page. Renders the
// PII display from the order: recipient name, phone, delivery address
// (delivery only), customer notes, and cancel reason if present.
//
// Sacred-invariant #8 (no PII logged): we DISPLAY this data because
// the customer asked to see their own order. We do NOT write any of
// it to trace() / Sentry breadcrumbs / console.

interface DeliveryBlockProps {
  order: OrderRead
}

export function DeliveryBlock({ order }: DeliveryBlockProps) {
  const t = useTranslations()
  const address = order.delivery_address as Record<string, string | null | undefined> | null
  return (
    <section
      data-slot="delivery-block"
      aria-label={t("checkout.section.delivery")}
      className="border-ink-100 bg-surface-card flex flex-col gap-3 rounded-lg border p-4"
    >
      <h2 className="text-h4 text-ink-900 font-semibold">{t("checkout.section.delivery")}</h2>
      <dl className="text-body-sm flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-700">{t("order.detail.recipient_label")}</dt>
          <dd className="text-ink-900">{order.recipient_name}</dd>
          <dd className="text-ink-700 tabular-nums">{formatPhoneDisplay(order.recipient_phone)}</dd>
        </div>
        {order.delivery_method === "delivery" && address ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-ink-700">{t("order.detail.delivery_address_label")}</dt>
            <dd className="text-ink-900">
              {[
                address.address_line,
                address.apartment,
                address.entrance,
                address.floor,
                address.city,
              ]
                .filter((part) => Boolean(part))
                .join(", ")}
            </dd>
            {address.landmark ? (
              <dd className="text-ink-600 text-caption">{address.landmark}</dd>
            ) : null}
            {address.delivery_notes ? (
              <dd className="text-ink-600 text-caption italic">{address.delivery_notes}</dd>
            ) : null}
          </div>
        ) : null}
        {order.customer_notes ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-ink-700">{t("order.detail.customer_notes_label")}</dt>
            <dd className="text-ink-700 italic">{order.customer_notes}</dd>
          </div>
        ) : null}
        {order.cancel_reason ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-ink-700">{t("order.detail.cancel_reason_label")}</dt>
            <dd className="text-ink-700">{order.cancel_reason}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
