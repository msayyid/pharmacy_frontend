"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { OrderRead } from "@/lib/api/types"
import { ApiError } from "@/lib/api/errors"
import { useCancelOrder } from "@/lib/orders/mutations"

// CancelOrderDialog — sacred-invariant #16 / hard-prohibition #16:
// shadcn AlertDialog only; never confirm() / alert(). Dialog opens
// from the trigger inside <CancelOrderButton>; on confirm runs
// useCancelOrder, surfaces toast on success, keeps dialog open with
// an inline error toast on failure.
//
// Customer-cancellable only in pending|confirmed (gate at the
// button surface; backend rejects with order_not_cancellable_by_customer
// if the gate slips — surfaced via t(`error.${code}`) toast).

interface CancelOrderDialogProps {
  order: OrderRead
  trigger: React.ReactNode
}

export function CancelOrderDialog({ order, trigger }: CancelOrderDialogProps) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const cancel = useCancelOrder()

  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent the default AlertDialogAction auto-close so we can
    // close ourselves only on success.
    e.preventDefault()
    cancel.mutate(
      { orderNumber: order.order_number, reason: reason.trim() || null },
      {
        onSuccess: () => {
          setOpen(false)
          setReason("")
          toast.success(t("order.cancel.success"))
        },
        onError: (err) => {
          const code = err instanceof ApiError ? err.code : "generic"
          // t() falls back to the key path on missing keys;
          // bracket-key access via a try/catch isn't necessary for
          // toast since the key path is acceptable as a worst-case.
          toast.error(t(`error.${code}`))
        },
      },
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent data-slot="cancel-order-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("order.cancel.confirm.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("order.cancel.confirm.body", { orderNumber: order.order_number })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cancel-reason" className="text-body-sm text-ink-700">
            {t("order.cancel.reason_label")}
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder={t("order.cancel.reason_placeholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            disabled={cancel.isPending}
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>
            {t("order.cancel.confirm.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={cancel.isPending}
            variant="destructive"
          >
            {cancel.isPending ? t("order.cancel.in_flight") : t("order.cancel.confirm.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface CancelOrderButtonProps {
  order: OrderRead
}

export function CancelOrderButton({ order }: CancelOrderButtonProps) {
  const t = useTranslations()
  return (
    <CancelOrderDialog
      order={order}
      trigger={
        <Button variant="outline" data-slot="cancel-order-cta">
          {t("order.cancel.cta")}
        </Button>
      }
    />
  )
}
