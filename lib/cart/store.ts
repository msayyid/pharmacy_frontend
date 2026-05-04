"use client"

import { create } from "zustand"

// Cart UI store — narrow client-only state per FRONTEND_BLUEPRINT §11.2.
// Cart DATA lives in TanStack Query cache (lib/cart/queries.ts); this store
// is for UI hints that don't map to server state:
//
//   - isDrawerOpen: drives the desktop CartDrawer's open/closed visibility.
//   - lastAddedItemId: set on add-to-cart success, used to flash-highlight
//                       the newly-added line in the drawer/page. Cleared
//                       when the drawer closes or after a 2s timeout.
//
// We resist adding cart items to this store. They live in TanStack Query.

export interface CartUiState {
  isDrawerOpen: boolean
  lastAddedItemId: number | null
  openDrawer: () => void
  closeDrawer: () => void
  setLastAdded: (itemId: number) => void
  clearLastAdded: () => void
}

export const useCartUiStore = create<CartUiState>((set) => ({
  isDrawerOpen: false,
  lastAddedItemId: null,
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false, lastAddedItemId: null }),
  setLastAdded: (itemId) => set({ lastAddedItemId: itemId }),
  clearLastAdded: () => set({ lastAddedItemId: null }),
}))
