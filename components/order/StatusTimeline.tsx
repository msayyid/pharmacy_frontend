"use client"

import { CheckIcon, CircleIcon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import type { Locale } from "@/i18n/config"
import type { OrderRead, OrderStatusHistoryRead } from "@/lib/api/types"
import { formatDate } from "@/lib/format/date"
import { expectedSequence, type OrderStatus } from "@/lib/orders/lifecycle"
import { cn } from "@/lib/utils"

// StatusTimeline — vertical stepper for the customer-visible state
// machine (DESIGN §13.x).
//
// Spine = expectedSequence(delivery_method) — the happy-path steps
// for delivery vs pickup. Each step is decorated with state info from
// the order's history[]:
//   - "done":      the corresponding to_status appears earlier than
//                  the current order.status; stamped with created_at.
//   - "active":    the order's current status === this step.
//   - "upcoming":  this step is later than current — muted, no stamp.
//
// Terminal interrupts (cancelled / refunded) collapse all upcoming
// rows into a single muted "—" row with the corresponding terminal
// copy. Ordered statuses BEFORE the interrupt remain "done" with
// their history timestamps.

interface StatusTimelineProps {
  order: OrderRead
  locale: Locale
}

type StepState = "done" | "active" | "upcoming"

interface SpineRow {
  status: OrderStatus
  state: StepState
  timestamp: string | null
}

function buildSpine(order: OrderRead): SpineRow[] {
  const sequence = expectedSequence(order.delivery_method)
  const currentIndex = sequence.indexOf(order.status as OrderStatus)
  // For non-terminal statuses we walk the sequence; for terminal
  // interrupts (cancelled / refunded) the spine collapses past the
  // last "done" step (handled by the consumer).
  return sequence.map((status, index) => {
    const historyMatch = findHistoryEntry(order.history ?? [], status)
    let state: StepState
    if (currentIndex === -1) {
      // Order is in a terminal-interrupt state. Steps that have a
      // history match render as done; the rest as upcoming.
      state = historyMatch ? "done" : "upcoming"
    } else if (index < currentIndex) {
      state = "done"
    } else if (index === currentIndex) {
      state = "active"
    } else {
      state = "upcoming"
    }
    return {
      status,
      state,
      timestamp: historyMatch?.created_at ?? null,
    }
  })
}

function findHistoryEntry(
  history: OrderStatusHistoryRead[],
  status: OrderStatus,
): OrderStatusHistoryRead | undefined {
  return history.find((row) => row.to_status === status)
}

const STATE_CLASS: Record<StepState, { circle: string; text: string }> = {
  done: { circle: "bg-success-500 text-white border-success-500", text: "text-ink-700" },
  active: {
    circle: "bg-brand-500 text-white border-brand-500",
    text: "text-ink-900 font-semibold",
  },
  upcoming: { circle: "bg-surface-card text-ink-300 border-ink-200", text: "text-ink-400" },
}

export function StatusTimeline({ order, locale }: StatusTimelineProps) {
  const t = useTranslations()
  const isCancelled = order.status === "cancelled"
  const isRefunded = order.status === "refunded"
  const isInterrupt = isCancelled || isRefunded

  const spine = buildSpine(order)
  const lastDoneIndex = (() => {
    let idx = -1
    spine.forEach((row, i) => {
      if (row.state === "done") idx = i
    })
    return idx
  })()

  return (
    <section
      data-slot="status-timeline"
      data-order-status={order.status}
      aria-label={t("order.detail.history_label")}
      className="border-ink-100 bg-surface-card flex flex-col rounded-lg border p-4"
    >
      <h2 className="text-h4 text-ink-900 mb-4 font-semibold">{t("order.detail.history_label")}</h2>
      <ol className="flex flex-col">
        {spine.map((row, index) => {
          // When interrupted, hide upcoming rows after the last "done"
          // and replace with a single terminal row (rendered after the loop).
          if (isInterrupt && index > lastDoneIndex) return null
          const labelKey = `order.timeline.step_label_${row.status}`
          const cls = STATE_CLASS[row.state]
          const isLast = index === spine.length - 1 && !isInterrupt
          return (
            <li
              key={row.status}
              data-step-status={row.status}
              data-step-state={row.state}
              className="relative flex items-start gap-3 pb-4 last:pb-0"
            >
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-6 left-3 h-full w-px",
                    row.state === "done" ? "bg-success-200" : "bg-ink-200",
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  cls.circle,
                )}
              >
                {row.state === "done" ? (
                  <CheckIcon className="size-3.5" />
                ) : row.state === "active" ? (
                  <span className="size-2 rounded-full bg-current" />
                ) : (
                  <CircleIcon className="size-3" />
                )}
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className={cn("text-body-sm", cls.text)}>{t(labelKey)}</p>
                {row.timestamp ? (
                  <p className="text-caption text-ink-500 tabular-nums">
                    {formatDate(row.timestamp, locale)}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
        {isInterrupt ? (
          <li
            data-step-state="terminal"
            data-step-status={order.status}
            className="flex items-start gap-3"
          >
            <span
              aria-hidden="true"
              className="bg-ink-100 text-ink-500 border-ink-200 flex size-6 shrink-0 items-center justify-center rounded-full border"
            >
              <XIcon className="size-3.5" />
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-body-sm text-ink-700 font-medium">
                {t(`order.timeline.step_label_${order.status}`)}
              </p>
              <p className="text-caption text-ink-600">
                {isCancelled
                  ? t("order.timeline.terminal_cancelled")
                  : t("order.timeline.terminal_refunded")}
              </p>
            </div>
          </li>
        ) : order.status === "delivered" ? (
          <li className="text-caption text-ink-500 mt-2 pl-9">
            {t("order.timeline.terminal_delivered")}
          </li>
        ) : null}
      </ol>
    </section>
  )
}
