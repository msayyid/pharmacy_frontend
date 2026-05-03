"use client"

import { MoreVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Address } from "@/lib/api/types"
import { formatPhoneDisplay } from "@/lib/format/phone"
import { cn } from "@/lib/utils"

// DESIGN §11.3 — AddressCard
// Saved-address card used on /account/addresses and (Phase 9) /checkout.
// Phase 5 fills in the Phase-2 backlog: shows label + default badge,
// recipient name + phone (formatted via libphonenumber-js KG), city +
// free-text address_line + optional landmark. Edit/delete in a dropdown.
//
// Default-toggle UX: clicking "Set as default" calls the parent onSetDefault
// which PATCHes the address with `is_default: true` (backend handles
// exclusivity — un-defaulting the previous default in the same transaction).

export interface AddressCardProps {
  address: Address
  editLabel: string
  deleteLabel: string
  setDefaultLabel: string
  defaultBadgeLabel: string
  actionsLabel: string
  onEdit: (address: Address) => void
  onDelete: (address: Address) => void
  onSetDefault?: (address: Address) => void
  className?: string
}

export function AddressCard({
  address,
  editLabel,
  deleteLabel,
  setDefaultLabel,
  defaultBadgeLabel,
  actionsLabel,
  onEdit,
  onDelete,
  onSetDefault,
  className,
}: AddressCardProps) {
  return (
    <article
      data-slot="address-card"
      className={cn(
        "border-ink-200 bg-surface-card flex flex-col gap-2 rounded-lg border p-4",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-h4 text-ink-800 font-semibold">
            {address.label ?? `#${address.id}`}
          </h3>
          {address.is_default ? <Badge variant="success">{defaultBadgeLabel}</Badge> : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={actionsLabel}>
              <MoreVerticalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(address)}>
              <PencilIcon aria-hidden="true" />
              <span>{editLabel}</span>
            </DropdownMenuItem>
            {!address.is_default && onSetDefault ? (
              <DropdownMenuItem onClick={() => onSetDefault(address)}>
                <span>{setDefaultLabel}</span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(address)}>
              <Trash2Icon aria-hidden="true" />
              <span>{deleteLabel}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {address.recipient_name || address.recipient_phone ? (
        <div className="text-body-sm text-ink-700 flex flex-col gap-0.5">
          {address.recipient_name ? <p>{address.recipient_name}</p> : null}
          {address.recipient_phone ? (
            <p className="tabular-nums">{formatPhoneDisplay(address.recipient_phone)}</p>
          ) : null}
        </div>
      ) : null}

      <div className="text-body text-ink-700 flex flex-col gap-0.5">
        <p>
          <span className="text-ink-500">{address.city},</span> {address.address_line}
        </p>
        {address.landmark ? (
          <p className="text-body-sm text-ink-500">↳ {address.landmark}</p>
        ) : null}
      </div>
    </article>
  )
}
