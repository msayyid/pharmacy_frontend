"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import * as React from "react"

import { AddressCard } from "@/components/address/AddressCard"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { ApiError } from "@/lib/api/errors"
import { apiClient } from "@/lib/api/client"
import type { Address } from "@/lib/api/types"

import { AddressForm } from "./address-form"

// /account/addresses — Client Component (D11/D12).
// CRUD addresses via TanStack Query mutations. Up to 10 addresses (F-ACC-002,
// FE cap matches backend). Default-toggle PATCHes is_default; backend
// handles exclusivity. Delete confirms via Dialog (DESIGN §11.2 + sacred
// invariant: confirm() / alert() forbidden, use shadcn Dialog).

const MAX_ADDRESSES = 10

type SheetMode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; address: Address }

export default function AddressesPage() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const [sheetMode, setSheetMode] = React.useState<SheetMode>({ kind: "closed" })
  const [pendingDelete, setPendingDelete] = React.useState<Address | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const response = await apiClient.GET("/api/v1/me/addresses" as never)
      return ((response as { data?: Address[] }).data ?? []) as Address[]
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: async (address: Address) => {
      await apiClient.PATCH(
        "/api/v1/me/addresses/{address_id}" as never,
        {
          params: { path: { address_id: address.id } },
          body: { is_default: true },
        } as never,
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (error) =>
      setActionError(error instanceof ApiError ? `error.${error.code}` : "error.generic"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (address: Address) => {
      await apiClient.DELETE(
        "/api/v1/me/addresses/{address_id}" as never,
        {
          params: { path: { address_id: address.id } },
        } as never,
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
      setPendingDelete(null)
    },
    onError: (error) => {
      setPendingDelete(null)
      setActionError(error instanceof ApiError ? `error.${error.code}` : "error.generic")
    },
  })

  if (addressesQuery.isPending) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </main>
    )
  }

  if (addressesQuery.isError) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
        <ErrorState
          title={t("error.generic")}
          body={t("error.network")}
          {...(addressesQuery.error instanceof ApiError ? { code: addressesQuery.error.code } : {})}
        />
      </main>
    )
  }

  const addresses = addressesQuery.data ?? []
  const canAddMore = addresses.length < MAX_ADDRESSES

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-h1 text-ink-900 font-semibold">
          {t("checkout.delivery.address_label")}
        </h1>
        <Button onClick={() => setSheetMode({ kind: "create" })} disabled={!canAddMore}>
          <PlusIcon aria-hidden="true" />
          <span>Добавить</span>
        </Button>
      </header>

      {actionError ? (
        <p className="text-body-sm text-danger-500" role="alert">
          {t(actionError)}
        </p>
      ) : null}

      {addresses.length === 0 ? (
        <EmptyState
          title="Адреса не сохранены"
          body="Сохраните адрес, чтобы быстрее оформлять заказы."
          cta={
            <Button onClick={() => setSheetMode({ kind: "create" })}>{t("cart.empty.cta")}</Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              editLabel="Изменить"
              deleteLabel="Удалить"
              setDefaultLabel="Сделать основным"
              defaultBadgeLabel="По умолчанию"
              actionsLabel="Действия"
              onEdit={(addr) => setSheetMode({ kind: "edit", address: addr })}
              onDelete={(addr) => setPendingDelete(addr)}
              onSetDefault={(addr) => setDefaultMutation.mutate(addr)}
            />
          ))}
        </div>
      )}

      <Sheet
        open={sheetMode.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setSheetMode({ kind: "closed" })
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{sheetMode.kind === "edit" ? "Изменить адрес" : "Новый адрес"}</SheetTitle>
            <SheetDescription>{t("checkout.delivery.landmark_hint")}</SheetDescription>
          </SheetHeader>
          {sheetMode.kind !== "closed" ? (
            <div className="px-6 py-4">
              <AddressForm
                {...(sheetMode.kind === "edit" ? { initial: sheetMode.address } : {})}
                onSuccess={() => setSheetMode({ kind: "closed" })}
                onCancel={() => setSheetMode({ kind: "closed" })}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить адрес?</DialogTitle>
            <DialogDescription>
              {pendingDelete ? `${pendingDelete.city}, ${pendingDelete.address_line}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t("auth.otp.return_to_phone")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
              loading={deleteMutation.isPending}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
